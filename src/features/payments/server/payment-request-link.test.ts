import { beforeEach, describe, expect, it, vi } from "vitest";
import { BCT_SANDBOX_TEST_LIMIT_TND } from "@/features/payments/constants";

vi.mock("@/features/payments/server/recipient-preview", () => ({ resolveRecipientPreview: vi.fn() }));

const { resolveRecipientPreview } = await import("@/features/payments/server/recipient-preview");
const { resolvePaymentRequestPrefill } = await import("@/features/payments/server/payment-request-link");

const CURRENT_USER_ID = "11111111-1111-1111-1111-111111111111";
const RECIPIENT_ID = "22222222-2222-2222-2222-222222222222";

const recipientPreview = {
  userId: RECIPIENT_ID,
  username: "someone",
  displayName: "Someone",
  verificationStatus: "verified" as const,
  primaryRouteLabel: null,
};

beforeEach(() => {
  vi.mocked(resolveRecipientPreview).mockReset();
});

describe("resolvePaymentRequestPrefill", () => {
  it("fails when the recipient doesn't exist", async () => {
    vi.mocked(resolveRecipientPreview).mockResolvedValue(null);

    const result = await resolvePaymentRequestPrefill({ username: "ghost", currentUserId: CURRENT_USER_ID });

    expect(result).toEqual({ ok: false });
  });

  it("fails on a self-pay link", async () => {
    vi.mocked(resolveRecipientPreview).mockResolvedValue({ ...recipientPreview, userId: CURRENT_USER_ID });

    const result = await resolvePaymentRequestPrefill({ username: "me", currentUserId: CURRENT_USER_ID });

    expect(result).toEqual({ ok: false });
  });

  it("resolves with a null amount when none is given", async () => {
    vi.mocked(resolveRecipientPreview).mockResolvedValue(recipientPreview);

    const result = await resolvePaymentRequestPrefill({ username: "someone", currentUserId: CURRENT_USER_ID });

    expect(result).toEqual({ ok: true, recipient: recipientPreview, amount: null });
  });

  it("resolves with the parsed amount when valid", async () => {
    vi.mocked(resolveRecipientPreview).mockResolvedValue(recipientPreview);

    const result = await resolvePaymentRequestPrefill({ username: "someone", rawAmount: "25.5", currentUserId: CURRENT_USER_ID });

    expect(result).toEqual({ ok: true, recipient: recipientPreview, amount: 25.5 });
  });

  it.each([["0"], ["-5"], ["not-a-number"], [String(BCT_SANDBOX_TEST_LIMIT_TND + 1)]])(
    "falls back to a null amount for an invalid/out-of-bounds value (%s)",
    async (rawAmount) => {
      vi.mocked(resolveRecipientPreview).mockResolvedValue(recipientPreview);

      const result = await resolvePaymentRequestPrefill({ username: "someone", rawAmount, currentUserId: CURRENT_USER_ID });

      expect(result).toEqual({ ok: true, recipient: recipientPreview, amount: null });
    },
  );
});
