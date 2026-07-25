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

/** Web fallback / gateway link shown on the intent-result screen. */
export function buildGatewayUrl(intent: PaymentIntent): string {
  return `${GATEWAY_BASE_URL}/pay?${buildQuery(intent)}`;
}

/** `crypto.randomUUID()` (Web Crypto, not `node:crypto`) so this stays
 * isomorphic - this file is imported from both client components and the
 * `payments/server/actions.ts` server action. `Math.random()`-based IDs
 * were both weak and a real (if rare) collision risk against `ref_id`'s
 * unique constraint; a UUID makes a collision effectively impossible. */
export function generateRefId(): string {
  return `ref_${crypto.randomUUID()}`;
}
