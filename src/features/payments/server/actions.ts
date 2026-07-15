"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { ActivityItem } from "@/features/activity/types";
import { getSessionIdentity } from "@/features/auth/server/dal";
import type { NotificationItem } from "@/features/notifications/types";
import type { PaymentIntent } from "@/features/payments/types";
import { generateRefId } from "@/features/payments/lib/tunpay";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

type SenderProfileRow = {
  id: string;
  username: string;
  display_name: string;
};

type DestinationRow = {
  id: string;
  user_id: string;
  name: string;
  routing_value: string;
};

type RecipientProfileRow = {
  id: string;
  username: string;
  display_name: string;
  verification_status: "unverified" | "pending" | "verified" | "rejected";
};

type TransactionInsertRow = {
  id: string;
  ref_id: string;
  amount: number | string;
  created_at: string;
};

type NotificationInsertRow = {
  id: string;
  user_id: string;
  type: NotificationItem["type"];
  title: string;
  body: string;
  unread: boolean;
  created_at: string;
};

const sendPaymentSchema = z.object({
  sourceWalletId: z.string().uuid(),
  recipientUsername: z
    .string()
    .trim()
    .transform((value) => value.replace(/^@+/, "").toLowerCase())
    .refine((value) => /^[a-z0-9_]{3,24}$/.test(value), {
      message: "Enter a valid SQUAD username.",
    }),
  amount: z.number().positive().max(100_000),
});

function formatActivityDate(value: string): string {
  const date = new Date(value);
  return new Intl.DateTimeFormat("fr-TN", {
    day: "2-digit",
    month: "short",
  }).format(date);
}

type CreatePaymentIntentInput = {
  sourceWalletId: string;
  recipientUsername: string;
  amount: number;
};

type CreatePaymentIntentResult =
  | {
      ok: true;
      intent: PaymentIntent;
      activity: ActivityItem;
      senderNotification: NotificationItem;
    }
  | { ok: false; message: string };

async function createPaymentIntentUnsafe(input: CreatePaymentIntentInput): Promise<CreatePaymentIntentResult> {
  const parsed = sendPaymentSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.flatten().fieldErrors.recipientUsername?.[0] ?? "Enter a valid amount and recipient.",
    };
  }

  const identity = await getSessionIdentity();
  if (!identity) {
    return { ok: false, message: "Your session expired. Sign in again." };
  }

  const admin = createAdminClient();
  const [{ data: senderProfile, error: senderError }, { data: sourceWallet, error: sourceError }, { data: recipient, error: recipientError }] =
    await Promise.all([
      admin.from("profiles").select("id, username, display_name").eq("id", identity.userId).maybeSingle<SenderProfileRow>(),
      admin
        .from("linked_destinations")
        .select("id, user_id, name, routing_value")
        .eq("id", parsed.data.sourceWalletId)
        .eq("user_id", identity.userId)
        .maybeSingle<DestinationRow>(),
      admin
        .from("profiles")
        .select("id, username, display_name, verification_status")
        .eq("username", parsed.data.recipientUsername)
        .maybeSingle<RecipientProfileRow>(),
    ]);

  if (senderError || !senderProfile) {
    return { ok: false, message: "We couldn't reload your profile right now." };
  }

  if (sourceError || !sourceWallet) {
    return { ok: false, message: "Choose one of your linked destinations first." };
  }

  if (recipientError || !recipient) {
    return { ok: false, message: "That recipient doesn't exist in SQUAD yet." };
  }

  if (recipient.id === senderProfile.id) {
    return { ok: false, message: "Use another SQUAD handle to test a transfer." };
  }

  const { data: recipientDestination, error: recipientDestinationError } = await admin
    .from("linked_destinations")
    .select("id, user_id, name, routing_value")
    .eq("user_id", recipient.id)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle<DestinationRow>();

  if (recipientDestinationError || !recipientDestination) {
    return { ok: false, message: "That recipient hasn't linked a destination yet." };
  }

  const refId = generateRefId();
  const { data: transaction, error: insertError } = await admin
    .from("payment_transactions")
    .insert({
      ref_id: refId,
      sender_user_id: senderProfile.id,
      recipient_user_id: recipient.id,
      sender_destination_id: sourceWallet.id,
      recipient_destination_id: recipientDestination.id,
      amount: parsed.data.amount,
      recipient_username: recipient.username,
      recipient_display_name: recipient.display_name,
      status: "initiated",
      metadata: {
        sender_display_name: senderProfile.display_name,
        sender_username: senderProfile.username,
        sender_wallet_name: sourceWallet.name,
        recipient_wallet_name: recipientDestination.name,
      },
    })
    .select("id, ref_id, amount, created_at")
    .single<TransactionInsertRow>();

  if (insertError || !transaction) {
    return { ok: false, message: "We couldn't save this payment route yet. Please retry." };
  }

  const senderNotificationDraft = {
    user_id: senderProfile.id,
    actor_user_id: recipient.id,
    transaction_id: transaction.id,
    type: "payment_sent" as const,
    title: "Intent TUNPAY cree",
    body: `Votre paiement vers @${recipient.username} a ete route a TUNPAY.`,
    unread: true,
  };

  const recipientNotificationDraft = {
    user_id: recipient.id,
    actor_user_id: senderProfile.id,
    transaction_id: transaction.id,
    type: "payment_received" as const,
    title: "Intent de paiement recu",
    body: `@${senderProfile.username} a prepare ${parsed.data.amount.toFixed(3)} DT a votre attention.`,
    unread: true,
  };

  const { data: notificationRows, error: notificationError } = await admin
    .from("notifications")
    .insert([senderNotificationDraft, recipientNotificationDraft])
    .select("id, user_id, type, title, body, unread, created_at");

  // The payment route itself already committed above - a notification-insert
  // failure must not report the whole intent as failed (the client would show
  // an error and the transaction row would silently exist anyway, inviting a
  // duplicate retry). Log it and fall back to locally-built notification data
  // below; the in-app notification is a nice-to-have, not the source of truth.
  if (notificationError) {
    logger.error("Failed to insert payment notifications", notificationError, { transactionId: transaction.id });
  }

  const senderNotificationRow = ((notificationRows ?? []) as NotificationInsertRow[]).find((row) => row.user_id === senderProfile.id);
  const senderNotification: NotificationItem = {
    id: senderNotificationRow?.id ?? transaction.id,
    type: senderNotificationRow?.type ?? senderNotificationDraft.type,
    title: senderNotificationRow?.title ?? senderNotificationDraft.title,
    body: senderNotificationRow?.body ?? senderNotificationDraft.body,
    unread: senderNotificationRow?.unread ?? true,
    createdAt: senderNotificationRow?.created_at ?? transaction.created_at,
  };

  revalidatePath("/home");

  return {
    ok: true,
    intent: {
      id: transaction.id,
      refId: transaction.ref_id,
      amount: Number(transaction.amount),
      recipient: `@${recipient.username}`,
      recipientDisplayName: recipient.display_name,
      sourceWalletId: sourceWallet.id,
      createdAt: new Date(transaction.created_at).getTime(),
      status: "dispatched",
    },
    activity: {
      id: transaction.id,
      refId: transaction.ref_id,
      type: "send",
      counterparty: recipient.display_name,
      counterpartyHandle: `@${recipient.username}`,
      wallet: sourceWallet.name,
      amount: Number(transaction.amount),
      date: formatActivityDate(transaction.created_at),
      status: "initiated",
    },
    senderNotification,
  };
}

// Every *expected* failure above already returns a typed { ok: false } result.
// This just catches anything unexpected (a thrown error from the Supabase
// client, a bug) so a single bad request can never crash the server action -
// the client gets a normal error toast and the failure is still logged with
// enough context to diagnose.
export async function createPaymentIntent(input: CreatePaymentIntentInput): Promise<CreatePaymentIntentResult> {
  try {
    return await createPaymentIntentUnsafe(input);
  } catch (error) {
    logger.error("Unhandled error creating payment intent", error, { sourceWalletId: input.sourceWalletId });
    return { ok: false, message: "We couldn't process this payment right now. Please try again." };
  }
}
