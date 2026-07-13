import type { PaymentIntent } from "@/features/payments/types";

const GATEWAY_BASE_URL = "https://gateway.mou3amla.tn";

function buildQuery(intent: PaymentIntent): string {
  const params = new URLSearchParams({
    to: intent.recipient,
    amount: intent.amount.toFixed(3),
    currency: "TND",
    ref: intent.refId,
  });
  return params.toString();
}

/** The universal interoperable intent rail — handed to a native banking app. */
export function buildTunpayUri(intent: PaymentIntent): string {
  return `tunpay://pay?${buildQuery(intent)}`;
}

/** Web fallback when no local handler accepts the tunpay:// intent structure. */
export function buildGatewayUrl(intent: PaymentIntent): string {
  return `${GATEWAY_BASE_URL}/pay?${buildQuery(intent)}`;
}

/** This app's own callback scheme for a completed hand-off (see docs/06-conventions.md). */
export function buildSuccessCallbackUrl(refId: string): string {
  return `mou3amla://payment-success?ref=${encodeURIComponent(refId)}`;
}

export function generateRefId(): string {
  return `ref_${Math.random().toString(36).slice(2, 10)}`;
}
