import "server-only";

import { verifyProviderPayment } from "@/features/payments/server/provider-checkouts";
import { finalizePaymentTransaction } from "@/features/payments/server/transaction-finalization";
import type { PaymentTransactionMetadata } from "@/features/payments/server/transaction-metadata";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

type TransactionLookupRow = {
  ref_id: string;
  metadata: PaymentTransactionMetadata | null;
};

type ProviderReturnResult =
  | {
      ok: true;
      redirectTo: string;
    }
  | { ok: false; redirectTo: string };

function buildHomeRedirect(refId: string): string {
  return `/home?payment_ref=${encodeURIComponent(refId)}`;
}

/**
 * Resolves the Mou3amla `ref_id` for a provider return/webhook hit. We always
 * put our own `?ref=` on the return/webhook URLs we hand the provider, but
 * Flouci is documented to redirect the browser with its own `payment_id`
 * appended, so a return can arrive keyed only by the provider's payment ref
 * (which we persisted as `metadata.provider_payment_ref` at intent time).
 */
export async function resolveRefIdFromProviderCallback(params: {
  refId?: string | null;
  providerPaymentRef?: string | null;
}): Promise<string | null> {
  const refId = params.refId?.trim();
  if (refId) {
    return refId;
  }

  const providerPaymentRef = params.providerPaymentRef?.trim();
  if (!providerPaymentRef) {
    return null;
  }

  const admin = createAdminClient();
  const { data } = await admin
    .from("payment_transactions")
    .select("ref_id")
    .eq("metadata->>provider_payment_ref", providerPaymentRef)
    .maybeSingle<{ ref_id: string }>();

  return data?.ref_id ?? null;
}

export async function verifyAndFinalizeProviderReturn(providerId: string, refId: string): Promise<ProviderReturnResult> {
  try {
    const admin = createAdminClient();
    const { data: transaction } = await admin
      .from("payment_transactions")
      .select("ref_id, metadata")
      .eq("ref_id", refId)
      .maybeSingle<TransactionLookupRow>();

    if (!transaction) {
      return { ok: false, redirectTo: "/home" };
    }

    const verification = await verifyProviderPayment(providerId, transaction.metadata);
    if (!verification.ok) {
      logger.warn("Provider payment verification did not complete", {
        provider_id: providerId,
        ref_id: refId,
        message: verification.message,
      });
      return { ok: false, redirectTo: buildHomeRedirect(refId) };
    }

    logger.info("Provider payment verified", {
      provider_id: providerId,
      ref_id: refId,
      provider_status: verification.providerStatus,
      resolved_status: verification.resolvedStatus,
      failure_reason: verification.failureReason,
    });

    await finalizePaymentTransaction({
      refId,
      providerStatus: verification.providerStatus,
      resolvedStatus: verification.resolvedStatus,
      providerPaymentRef: verification.providerPaymentRef,
      failureReason: verification.failureReason,
    });

    return {
      ok: true,
      redirectTo: buildHomeRedirect(refId),
    };
  } catch {
    return { ok: false, redirectTo: buildHomeRedirect(refId) };
  }
}
