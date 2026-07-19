import "server-only";

import { verifyProviderPayment } from "@/features/payments/server/provider-checkouts";
import { finalizePaymentTransaction } from "@/features/payments/server/transaction-finalization";
import type { PaymentTransactionMetadata } from "@/features/payments/server/transaction-metadata";
import { createAdminClient } from "@/lib/supabase/admin";

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
      return { ok: false, redirectTo: buildHomeRedirect(refId) };
    }

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
