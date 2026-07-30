import "server-only";
import { BCT_SANDBOX_TEST_LIMIT_TND } from "@/features/payments/constants";
import { resolveRecipientPreview } from "@/features/payments/server/recipient-preview";
import type { RecipientPreview } from "@/features/payments/types";

type PaymentRequestPrefillResult = { ok: true; recipient: RecipientPreview; amount: number | null } | { ok: false };

/** A bad/missing amount is not a hard failure, only a missing prefill - the
 * amount is never trusted as authoritative, `createPaymentIntent` re-validates
 * it independently on the real send either way. */
function parsePrefillAmount(rawAmount: string | undefined): number | null {
  if (!rawAmount) return null;
  const parsed = Number.parseFloat(rawAmount);
  if (!Number.isFinite(parsed) || parsed <= 0 || parsed > BCT_SANDBOX_TEST_LIMIT_TND) return null;
  return parsed;
}

/**
 * Resolves a `/pay/[username]` link into recipient + amount prefill values
 * for `generate-intent-screen.tsx`. Purely a UI convenience: the resolved
 * recipient still has to pass every check `createPaymentIntentUnsafe`
 * (`server/actions.ts`) already runs before money moves - this never
 * authorizes a payment on its own.
 */
export async function resolvePaymentRequestPrefill(input: {
  username: string;
  rawAmount?: string;
  currentUserId: string;
}): Promise<PaymentRequestPrefillResult> {
  const recipient = await resolveRecipientPreview({ username: input.username });

  if (!recipient || recipient.userId === input.currentUserId) {
    return { ok: false };
  }

  return { ok: true, recipient, amount: parsePrefillAmount(input.rawAmount) };
}
