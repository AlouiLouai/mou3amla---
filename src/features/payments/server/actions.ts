"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { ActivityItem } from "@/features/activity/types";
import { getSessionIdentity } from "@/features/auth/server/dal";
import type { NotificationItem } from "@/features/notifications/types";
import { canLaunchProviderCheckout, isCheckoutServiceDown } from "@/features/payments/lib/provider-checkout";
import type { PaymentCheckoutLaunch, PaymentIntent } from "@/features/payments/types";
import { createProviderCheckout } from "@/features/payments/server/provider-checkouts";
import type { PaymentTransactionMetadata } from "@/features/payments/server/transaction-metadata";
import { generateRefId } from "@/features/payments/lib/tunpay";
import { BCT_SANDBOX_TEST_LIMIT_TND } from "@/features/payments/constants";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

type SenderProfileRow = {
  id: string;
  username: string;
  display_name: string;
};

type DestinationRow = {
  id: string;
  user_id: string;
  provider_id: string;
  name: string;
  routing_value: string;
};

type RecipientProfileRow = {
  id: string;
  username: string;
  display_name: string;
  verification_status: "unverified" | "pending" | "verified" | "rejected";
};

type TransactionRow = {
  id: string;
  ref_id: string;
  amount: number | string;
  status: "initiated" | "confirmed" | "failed";
  metadata: PaymentTransactionMetadata | null;
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

const DUPLICATE_SUBMIT_WINDOW_MS = 10_000;

const sendPaymentSchema = z.object({
  sourceWalletId: z.string().uuid(),
  recipientUsername: z
    .string()
    .trim()
    .transform((value) => value.replace(/^@+/, "").toLowerCase())
    .refine((value) => /^[a-z0-9_]{3,24}$/.test(value), {
      message: "Enter a valid Mou3amla username.",
    }),
  amount: z.number().positive().max(BCT_SANDBOX_TEST_LIMIT_TND, {
    message: `Sandbox test transactions are capped at ${BCT_SANDBOX_TEST_LIMIT_TND} TND while Mou3amla is under BCT regulatory testing.`,
  }),
});

function formatActivityDate(value: string): string {
  const date = new Date(value);
  return new Intl.DateTimeFormat("fr-TN", {
    day: "2-digit",
    month: "short",
  }).format(date);
}

function normalizeAmount(value: number | string): number {
  return typeof value === "number" ? value : Number.parseFloat(value);
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
      checkout: PaymentCheckoutLaunch;
    }
  | { ok: false; message: string };

async function createPaymentIntentUnsafe(input: CreatePaymentIntentInput): Promise<CreatePaymentIntentResult> {
  const parsed = sendPaymentSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors;
    return {
      ok: false,
      message: fieldErrors.recipientUsername?.[0] ?? fieldErrors.amount?.[0] ?? "Enter a valid amount and recipient.",
    };
  }

  const identity = await getSessionIdentity();
  if (!identity) {
    return { ok: false, message: "Your session expired. Sign in again." };
  }

  const withinLimit = await checkRateLimit(`create-payment-intent:${identity.userId}`, { max: 20, windowSeconds: 300 });
  if (!withinLimit) {
    return { ok: false, message: "Too many payment attempts. Please wait a few minutes and try again." };
  }

  const admin = createAdminClient();
  const [{ data: senderProfile, error: senderError }, { data: sourceWallet, error: sourceError }, { data: recipient, error: recipientError }] =
    await Promise.all([
      admin.from("profiles").select("id, username, display_name").eq("id", identity.userId).maybeSingle<SenderProfileRow>(),
      admin
        .from("linked_destinations")
        .select("id, user_id, provider_id, name, routing_value")
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

  if (isCheckoutServiceDown(sourceWallet.provider_id)) {
    return {
      ok: false,
      message: `${sourceWallet.name} is temporarily unavailable in this demo. Choose another linked account to keep testing.`,
    };
  }

  if (!canLaunchProviderCheckout(sourceWallet.provider_id)) {
    return {
      ok: false,
      message: `${sourceWallet.name} isn't available in Mou3amla's supported checkout flows yet.`,
    };
  }

  if (recipientError || !recipient) {
    return { ok: false, message: "That recipient doesn't exist in Mou3amla yet." };
  }

  if (recipient.id === senderProfile.id) {
    return { ok: false, message: "Use another Mou3amla handle to test a transfer." };
  }

  if (recipient.verification_status !== "verified") {
    return { ok: false, message: "This recipient hasn't completed identity verification yet - you can't send to them." };
  }

  const { data: recipientDestination, error: recipientDestinationError } = await admin
    .from("linked_destinations")
    .select("id, user_id, provider_id, name, routing_value")
    .eq("user_id", recipient.id)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle<DestinationRow>();

  if (recipientDestinationError || !recipientDestination) {
    return { ok: false, message: "That recipient hasn't linked a destination yet." };
  }

  const { data: recentDuplicate } = await admin
    .from("payment_transactions")
    .select("id, ref_id, amount, status, metadata, created_at")
    .eq("sender_user_id", senderProfile.id)
    .eq("recipient_user_id", recipient.id)
    .eq("sender_destination_id", sourceWallet.id)
    .eq("amount", parsed.data.amount)
    .eq("status", "initiated")
    .gte("created_at", new Date(Date.now() - DUPLICATE_SUBMIT_WINDOW_MS).toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<TransactionRow>();

  let transaction: TransactionRow;
  let checkout: PaymentCheckoutLaunch;
  let notificationRows: NotificationInsertRow[] = [];

  const duplicateProviderId = recentDuplicate?.metadata?.provider_id;
  if (recentDuplicate && recentDuplicate.metadata?.provider_checkout_url && duplicateProviderId) {
    transaction = recentDuplicate;
    checkout = {
      providerId: duplicateProviderId,
      providerName: recentDuplicate.metadata.provider_name ?? sourceWallet.name,
      url: recentDuplicate.metadata.provider_checkout_url,
    };

    const { data: existingNotifications } = await admin
      .from("notifications")
      .select("id, user_id, type, title, body, unread, created_at")
      .eq("transaction_id", transaction.id)
      .eq("user_id", senderProfile.id);
    notificationRows = (existingNotifications ?? []) as NotificationInsertRow[];
  } else {
    const refId = generateRefId();
    const checkoutResult = await createProviderCheckout({
      providerId: sourceWallet.provider_id,
      providerName: sourceWallet.name,
      refId,
      amount: parsed.data.amount,
      payerPhone: identity.phone,
      recipientHandle: `@${recipient.username}`,
    });

    if (!checkoutResult.ok) {
      return checkoutResult;
    }

    checkout = {
      providerId: checkoutResult.providerId,
      providerName: checkoutResult.providerName,
      url: checkoutResult.checkoutUrl,
    };

    const metadata: PaymentTransactionMetadata = {
      sender_display_name: senderProfile.display_name,
      sender_username: senderProfile.username,
      sender_wallet_name: sourceWallet.name,
      recipient_wallet_name: recipientDestination.name,
      provider_id: checkoutResult.providerId,
      provider_name: checkoutResult.providerName,
      provider_checkout_url: checkoutResult.checkoutUrl,
      provider_payment_ref: checkoutResult.providerPaymentRef,
      provider_status: checkoutResult.providerStatus,
      provider_return_url: checkoutResult.returnUrl,
      provider_webhook_url: checkoutResult.webhookUrl,
      demo_checkout_mode: checkoutResult.checkoutMode,
    };

    const { data: inserted, error: insertError } = await admin
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
        metadata,
      })
      .select("id, ref_id, amount, status, metadata, created_at")
      .single<TransactionRow>();

    if (insertError || !inserted) {
      return { ok: false, message: "We couldn't save this payment route yet. Please retry." };
    }
    transaction = inserted;

    const senderNotificationDraft = {
      user_id: senderProfile.id,
      actor_user_id: recipient.id,
      transaction_id: transaction.id,
      type: "payment_sent" as const,
      title:
        checkoutResult.checkoutMode === "hosted"
          ? `${sourceWallet.name} sandbox checkout pret`
          : `Mock checkout ${sourceWallet.name} pret`,
      body:
        checkoutResult.checkoutMode === "hosted"
          ? `Votre paiement vers @${recipient.username} attend validation dans le checkout sandbox ${sourceWallet.name}.`
          : `Votre paiement vers @${recipient.username} attend validation dans le mock checkout ${sourceWallet.name}.`,
      unread: true,
      metadata: {},
    };

    const { data: insertedNotifications, error: notificationError } = await admin
      .from("notifications")
      .insert(senderNotificationDraft)
      .select("id, user_id, type, title, body, unread, created_at");

    if (notificationError) {
      logger.error("Failed to insert sender payment notification", notificationError, { transactionId: transaction.id });
    }

    notificationRows = (insertedNotifications ?? []) as NotificationInsertRow[];
  }

  const senderNotificationRow = notificationRows.find((row) => row.user_id === senderProfile.id);
  const senderNotification: NotificationItem = {
    id: senderNotificationRow?.id ?? transaction.id,
    type: senderNotificationRow?.type ?? "payment_sent",
    title:
      senderNotificationRow?.title ??
      (checkout.providerId === "konnect" ? `${checkout.providerName} sandbox checkout pret` : `Mock checkout ${checkout.providerName} pret`),
    body:
      senderNotificationRow?.body ??
      (checkout.providerId === "konnect"
        ? `Votre paiement vers @${recipient.username} attend validation dans le checkout sandbox ${checkout.providerName}.`
        : `Votre paiement vers @${recipient.username} attend validation dans le mock checkout ${checkout.providerName}.`),
    unread: senderNotificationRow?.unread ?? true,
    createdAt: senderNotificationRow?.created_at ?? transaction.created_at,
  };

  revalidatePath("/home");

  return {
    ok: true,
    intent: {
      id: transaction.id,
      refId: transaction.ref_id,
      amount: normalizeAmount(transaction.amount),
      recipient: `@${recipient.username}`,
      recipientDisplayName: recipient.display_name,
      sourceWalletId: sourceWallet.id,
      createdAt: new Date(transaction.created_at).getTime(),
      status: transaction.status === "confirmed" ? "confirmed" : "dispatched",
    },
    activity: {
      id: transaction.id,
      refId: transaction.ref_id,
      type: "send",
      counterparty: recipient.display_name,
      counterpartyHandle: `@${recipient.username}`,
      wallet: sourceWallet.name,
      amount: normalizeAmount(transaction.amount),
      date: formatActivityDate(transaction.created_at),
      status: transaction.status,
    },
    senderNotification,
    checkout,
  };
}

export async function createPaymentIntent(input: CreatePaymentIntentInput): Promise<CreatePaymentIntentResult> {
  try {
    return await createPaymentIntentUnsafe(input);
  } catch (error) {
    logger.error("Unhandled error creating payment intent", error, { sourceWalletId: input.sourceWalletId });
    return { ok: false, message: "We couldn't process this payment right now. Please try again." };
  }
}
