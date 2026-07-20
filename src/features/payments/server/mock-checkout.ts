import "server-only";

import { z } from "zod";
import type { PersistedTransactionStatus } from "@/features/payments/types";
import type { PaymentTransactionMetadata } from "@/features/payments/server/transaction-metadata";
import { finalizePaymentTransaction } from "@/features/payments/server/transaction-finalization";
import { createAdminClient } from "@/lib/supabase/admin";

type MockCheckoutRow = {
  ref_id: string;
  sender_user_id: string;
  recipient_username: string;
  recipient_display_name: string | null;
  amount: number | string;
  status: PersistedTransactionStatus;
  metadata: PaymentTransactionMetadata | null;
  created_at: string;
};

const completeMockCheckoutSchema = z.object({
  refId: z.string().trim().min(1),
  outcome: z.enum(["confirmed", "failed"]),
});

function normalizeAmount(value: number | string) {
  return typeof value === "number" ? value : Number.parseFloat(value);
}

function buildHomeRedirect(refId: string) {
  return `/home?screen=activity&payment_ref=${encodeURIComponent(refId)}`;
}

export async function loadMockCheckoutSession(refId: string, viewerUserId: string) {
  const admin = createAdminClient();
  const { data: transaction, error } = await admin
    .from("payment_transactions")
    .select("ref_id, sender_user_id, recipient_username, recipient_display_name, amount, status, metadata, created_at")
    .eq("ref_id", refId)
    .maybeSingle<MockCheckoutRow>();

  if (error || !transaction) {
    return null;
  }

  if (transaction.sender_user_id !== viewerUserId) {
    return null;
  }

  if (transaction.metadata?.demo_checkout_mode !== "internal_mock") {
    return null;
  }

  return {
    refId: transaction.ref_id,
    amount: normalizeAmount(transaction.amount),
    currency: "TND" as const,
    status: transaction.status,
    providerName: transaction.metadata?.provider_name ?? transaction.metadata?.sender_wallet_name ?? "Mou3amla Route",
    senderDisplayName: transaction.metadata?.sender_display_name ?? "Mou3amla User",
    senderUsername: transaction.metadata?.sender_username ?? "mou3amla",
    receiverDisplayName: transaction.recipient_display_name ?? `@${transaction.recipient_username}`,
    receiverUsername: transaction.recipient_username,
    senderWalletName: transaction.metadata?.sender_wallet_name ?? "Mou3amla Route",
    createdAt: transaction.created_at,
  };
}

export type CompleteMockCheckoutResult =
  | { ok: true; redirectTo: string }
  | { ok: false; message: string };

export async function completeMockCheckoutUnsafe(
  input: z.infer<typeof completeMockCheckoutSchema>,
  viewerUserId: string,
): Promise<CompleteMockCheckoutResult> {
  const parsed = completeMockCheckoutSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: "This mock checkout request is missing its payment reference." };
  }

  const admin = createAdminClient();
  const { data: transaction, error } = await admin
    .from("payment_transactions")
    .select("ref_id, sender_user_id, status, metadata")
    .eq("ref_id", parsed.data.refId)
    .maybeSingle<Pick<MockCheckoutRow, "ref_id" | "sender_user_id" | "status" | "metadata">>();

  if (error || !transaction || transaction.sender_user_id !== viewerUserId) {
    return { ok: false, message: "That mock checkout doesn't belong to your active Mou3amla session." };
  }

  if (transaction.metadata?.demo_checkout_mode !== "internal_mock") {
    return { ok: false, message: "This payment wasn't created through the internal Mou3amla mock checkout." };
  }

  if (transaction.status !== "initiated") {
    return { ok: true, redirectTo: buildHomeRedirect(transaction.ref_id) };
  }

  const resolvedStatus: PersistedTransactionStatus = parsed.data.outcome === "confirmed" ? "confirmed" : "failed";
  const providerStatus = parsed.data.outcome === "confirmed" ? "DEVELOPMENT_MOCK_CONFIRMED" : "DEVELOPMENT_MOCK_FAILED";
  const providerPaymentRef = transaction.metadata?.provider_payment_ref ?? `MOCK_${transaction.ref_id}`;

  const result = await finalizePaymentTransaction({
    refId: transaction.ref_id,
    providerStatus,
    resolvedStatus,
    providerPaymentRef,
    failureReason: parsed.data.outcome === "failed" ? "DEVELOPMENT_MOCK_FAILED" : undefined,
  });

  if (!result.ok) {
    return { ok: false, message: result.message };
  }

  return { ok: true, redirectTo: buildHomeRedirect(transaction.ref_id) };
}
