import "server-only";

import { revalidatePath } from "next/cache";
import type { ActivityItem } from "@/features/activity/types";
import type { NotificationItem } from "@/features/notifications/types";
import type { PersistedTransactionStatus } from "@/features/payments/types";
import type { PaymentTransactionMetadata } from "@/features/payments/server/transaction-metadata";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

type TransactionRow = {
  id: string;
  ref_id: string;
  sender_user_id: string;
  recipient_user_id: string | null;
  amount: number | string;
  recipient_username: string;
  recipient_display_name: string | null;
  status: PersistedTransactionStatus;
  metadata: PaymentTransactionMetadata | null;
  created_at: string;
};

type CounterpartyRow = {
  id: string;
  username: string;
  display_name: string;
};

type NotificationRow = {
  id: string;
};

type FinalizeTransactionInput = {
  refId: string;
  providerStatus: string;
  resolvedStatus: PersistedTransactionStatus;
  providerPaymentRef: string;
  failureReason?: string;
};

type FinalizeTransactionResult =
  | {
      ok: true;
      refId: string;
      status: PersistedTransactionStatus;
    }
  | { ok: false; message: string; status?: number };

function normalizeAmount(value: number | string): number {
  return typeof value === "number" ? value : Number.parseFloat(value);
}

function formatActivityDate(value: string): string {
  const date = new Date(value);
  return new Intl.DateTimeFormat("fr-TN", {
    day: "2-digit",
    month: "short",
  }).format(date);
}

function buildRecipientActivity(transaction: TransactionRow, sender: CounterpartyRow): ActivityItem {
  return {
    id: transaction.id,
    refId: transaction.ref_id,
    type: "receive",
    counterparty: sender.display_name,
    counterpartyHandle: `@${sender.username}`,
    wallet: transaction.metadata?.recipient_wallet_name ?? "Route Mou3amla",
    amount: normalizeAmount(transaction.amount),
    date: formatActivityDate(transaction.created_at),
    status: transaction.status,
  };
}

async function hasNotification(
  admin: ReturnType<typeof createAdminClient>,
  transactionId: string,
  userId: string,
  type: NotificationItem["type"],
): Promise<boolean> {
  const { data } = await admin
    .from("notifications")
    .select("id")
    .eq("transaction_id", transactionId)
    .eq("user_id", userId)
    .eq("type", type)
    .maybeSingle<NotificationRow>();
  return !!data;
}

async function loadProfile(admin: ReturnType<typeof createAdminClient>, userId: string): Promise<CounterpartyRow | null> {
  const { data, error } = await admin.from("profiles").select("id, username, display_name").eq("id", userId).maybeSingle<CounterpartyRow>();
  return error || !data ? null : data;
}

export async function finalizePaymentTransaction(input: FinalizeTransactionInput): Promise<FinalizeTransactionResult> {
  const admin = createAdminClient();
  const { data: transaction, error: transactionError } = await admin
    .from("payment_transactions")
    .select("id, ref_id, sender_user_id, recipient_user_id, amount, recipient_username, recipient_display_name, status, metadata, created_at")
    .eq("ref_id", input.refId)
    .maybeSingle<TransactionRow>();

  if (transactionError || !transaction) {
    return { ok: false, message: "Transaction not found.", status: 404 };
  }

  const nextMetadata: PaymentTransactionMetadata = {
    ...(transaction.metadata ?? {}),
    provider_status: input.providerStatus,
    provider_payment_ref: input.providerPaymentRef,
    provider_verified_at: new Date().toISOString(),
    ...(input.failureReason ? { provider_failure_reason: input.failureReason } : {}),
  };

  const needsStatusUpdate = transaction.status !== input.resolvedStatus;
  const needsMetadataUpdate =
    transaction.metadata?.provider_status !== nextMetadata.provider_status ||
    transaction.metadata?.provider_payment_ref !== nextMetadata.provider_payment_ref ||
    transaction.metadata?.provider_failure_reason !== nextMetadata.provider_failure_reason;

  if (needsStatusUpdate || needsMetadataUpdate) {
    const { error: updateError } = await admin
      .from("payment_transactions")
      .update({
        status: input.resolvedStatus,
        metadata: nextMetadata,
      })
      .eq("id", transaction.id);

    if (updateError) {
      logger.error("Failed to update payment transaction status", updateError, { refId: input.refId });
      return { ok: false, message: "We couldn't finalize this payment right now.", status: 500 };
    }

    transaction.status = input.resolvedStatus;
    transaction.metadata = nextMetadata;
  }

  if (input.resolvedStatus === "confirmed" && transaction.recipient_user_id) {
    if (!(await hasNotification(admin, transaction.id, transaction.recipient_user_id, "payment_received"))) {
      const senderProfile = await loadProfile(admin, transaction.sender_user_id);

      if (!senderProfile) {
        logger.error("Failed to load sender profile for payment notification", undefined, { refId: input.refId });
      } else {
        const activity = buildRecipientActivity(transaction, senderProfile);
        const { error: notificationError } = await admin.from("notifications").insert({
          user_id: transaction.recipient_user_id,
          actor_user_id: senderProfile.id,
          transaction_id: transaction.id,
          type: "payment_received" as NotificationItem["type"],
          title: "Paiement recu",
          body: `@${senderProfile.username} vous a envoye ${normalizeAmount(transaction.amount).toFixed(3)} DT via ${transaction.metadata?.provider_name ?? "Mou3amla"}.`,
          unread: true,
          metadata: { activity },
        });
        if (notificationError) {
          logger.error("Failed to insert confirmed payment notification", notificationError, { refId: input.refId });
        }
      }
    }
  }

  // A failed payment is told to both sides, not just the sender - the
  // recipient never got a "payment incoming" notice in the first place, so
  // without this they'd have no way to know a transfer to them stalled.
  if (input.resolvedStatus === "failed") {
    const amountLabel = normalizeAmount(transaction.amount).toFixed(3);

    if (!(await hasNotification(admin, transaction.id, transaction.sender_user_id, "payment_failed"))) {
      const { error: notificationError } = await admin.from("notifications").insert({
        user_id: transaction.sender_user_id,
        actor_user_id: transaction.recipient_user_id,
        transaction_id: transaction.id,
        type: "payment_failed" as NotificationItem["type"],
        title: "Paiement echoue",
        body: `Votre paiement de ${amountLabel} DT vers @${transaction.recipient_username} n'a pas abouti. Reessayez ou choisissez une autre destination.`,
        unread: true,
        metadata: {},
      });
      if (notificationError) {
        logger.error("Failed to insert sender payment-failed notification", notificationError, { refId: input.refId });
      }
    }

    if (transaction.recipient_user_id && !(await hasNotification(admin, transaction.id, transaction.recipient_user_id, "payment_failed"))) {
      const senderProfile = await loadProfile(admin, transaction.sender_user_id);

      if (!senderProfile) {
        logger.error("Failed to load sender profile for payment-failed notification", undefined, { refId: input.refId });
      } else {
        const { error: notificationError } = await admin.from("notifications").insert({
          user_id: transaction.recipient_user_id,
          actor_user_id: senderProfile.id,
          transaction_id: transaction.id,
          type: "payment_failed" as NotificationItem["type"],
          title: "Paiement echoue",
          body: `Un paiement de @${senderProfile.username} (${amountLabel} DT) n'a pas abouti - rien n'a ete envoye.`,
          unread: true,
          metadata: {},
        });
        if (notificationError) {
          logger.error("Failed to insert recipient payment-failed notification", notificationError, { refId: input.refId });
        }
      }
    }
  }

  revalidatePath("/home");

  return {
    ok: true,
    refId: transaction.ref_id,
    status: transaction.status,
  };
}
