"use server";

import { z } from "zod";
import { getSessionIdentity } from "@/features/auth/server/dal";
import { completeMockCheckoutUnsafe, type CompleteMockCheckoutResult } from "@/features/payments/server/mock-checkout";
import { checkRateLimit } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

const completeMockCheckoutSchema = z.object({
  refId: z.string().trim().min(1),
  outcome: z.enum(["confirmed", "failed"]),
});

export async function completeMockCheckout(input: z.infer<typeof completeMockCheckoutSchema>): Promise<CompleteMockCheckoutResult> {
  try {
    const parsed = completeMockCheckoutSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, message: "This mock checkout request is missing its payment reference." };
    }

    const identity = await getSessionIdentity();
    if (!identity) {
      return { ok: false, message: "Your session expired. Sign in again." };
    }

    const withinLimit = await checkRateLimit(`complete-mock-checkout:${identity.userId}`, { max: 20, windowSeconds: 300 });
    if (!withinLimit) {
      return { ok: false, message: "Too many mock checkout attempts. Please wait a moment and try again." };
    }

    return await completeMockCheckoutUnsafe(parsed.data, identity.userId);
  } catch (error) {
    logger.error("Unhandled error completing mock checkout", error, { refId: input.refId, outcome: input.outcome });
    return { ok: false, message: "We couldn't finalize this mock checkout right now. Please try again." };
  }
}
