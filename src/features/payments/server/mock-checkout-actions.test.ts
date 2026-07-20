import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));
vi.mock("@/features/auth/server/dal", () => ({ getSessionIdentity: vi.fn() }));
vi.mock("@/lib/rate-limit", () => ({ checkRateLimit: vi.fn() }));
vi.mock("@/features/payments/server/transaction-finalization", () => ({ finalizePaymentTransaction: vi.fn() }));

const { createAdminClient } = await import("@/lib/supabase/admin");
const { getSessionIdentity } = await import("@/features/auth/server/dal");
const { checkRateLimit } = await import("@/lib/rate-limit");
const { finalizePaymentTransaction } = await import("@/features/payments/server/transaction-finalization");
const { completeMockCheckout } = await import("@/features/payments/server/mock-checkout-actions");

const USER_ID = "11111111-1111-1111-1111-111111111111";
const REF_ID = "ref_mock_123";

function makeFrom(queue: unknown[]) {
  const from = vi.fn(() => {
    const result = (queue.shift() ?? { data: null, error: null }) as { data?: unknown; error?: unknown };
    const builder: Record<string, unknown> = {
      select: () => builder,
      eq: () => builder,
      maybeSingle: () => Promise.resolve(result),
    };
    return builder;
  });

  return { from };
}

function makeFakeAdmin(queue: unknown[] = []) {
  const { from } = makeFrom(queue);
  return { admin: { from } };
}

beforeEach(() => {
  vi.mocked(createAdminClient).mockReset();
  vi.mocked(getSessionIdentity).mockReset().mockResolvedValue({ userId: USER_ID, phone: "+21620123456" } as never);
  vi.mocked(checkRateLimit).mockReset().mockResolvedValue(true);
  vi.mocked(finalizePaymentTransaction).mockReset().mockResolvedValue({ ok: true, refId: REF_ID, status: "confirmed" } as never);
});

describe("completeMockCheckout", () => {
  it("rejects malformed input before touching auth or the database", async () => {
    const result = await completeMockCheckout({ refId: "", outcome: "confirmed" });

    expect(result).toEqual({ ok: false, message: expect.stringMatching(/missing/i) });
    expect(getSessionIdentity).not.toHaveBeenCalled();
  });

  it("requires an active session", async () => {
    vi.mocked(getSessionIdentity).mockResolvedValue(null);

    const result = await completeMockCheckout({ refId: REF_ID, outcome: "confirmed" });

    expect(result).toEqual({ ok: false, message: expect.stringMatching(/session expired/i) });
    expect(createAdminClient).not.toHaveBeenCalled();
  });

  it("rejects when rate-limited", async () => {
    vi.mocked(checkRateLimit).mockResolvedValue(false);

    const result = await completeMockCheckout({ refId: REF_ID, outcome: "confirmed" });

    expect(result).toEqual({ ok: false, message: expect.stringMatching(/too many mock checkout attempts/i) });
    expect(createAdminClient).not.toHaveBeenCalled();
  });

  it("rejects a checkout that doesn't belong to the signed-in user", async () => {
    const { admin } = makeFakeAdmin([
      {
        data: {
          ref_id: REF_ID,
          sender_user_id: "22222222-2222-2222-2222-222222222222",
          status: "initiated",
          metadata: { demo_checkout_mode: "internal_mock", provider_payment_ref: `MOCK_${REF_ID}` },
        },
        error: null,
      },
    ]);
    vi.mocked(createAdminClient).mockReturnValue(admin as never);

    const result = await completeMockCheckout({ refId: REF_ID, outcome: "confirmed" });

    expect(result).toEqual({ ok: false, message: expect.stringMatching(/doesn't belong/i) });
    expect(finalizePaymentTransaction).not.toHaveBeenCalled();
  });

  it("finalizes a successful mock checkout and returns the redirect target", async () => {
    const { admin } = makeFakeAdmin([
      {
        data: {
          ref_id: REF_ID,
          sender_user_id: USER_ID,
          status: "initiated",
          metadata: { demo_checkout_mode: "internal_mock", provider_payment_ref: `MOCK_${REF_ID}` },
        },
        error: null,
      },
    ]);
    vi.mocked(createAdminClient).mockReturnValue(admin as never);

    const result = await completeMockCheckout({ refId: REF_ID, outcome: "confirmed" });

    expect(result).toEqual({ ok: true, redirectTo: `/home?screen=activity&payment_ref=${encodeURIComponent(REF_ID)}` });
    expect(finalizePaymentTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        refId: REF_ID,
        resolvedStatus: "confirmed",
        providerStatus: "DEVELOPMENT_MOCK_CONFIRMED",
        providerPaymentRef: `MOCK_${REF_ID}`,
      }),
    );
  });

  it("passes a failure reason when simulating a failed checkout", async () => {
    const { admin } = makeFakeAdmin([
      {
        data: {
          ref_id: REF_ID,
          sender_user_id: USER_ID,
          status: "initiated",
          metadata: { demo_checkout_mode: "internal_mock", provider_payment_ref: `MOCK_${REF_ID}` },
        },
        error: null,
      },
    ]);
    vi.mocked(createAdminClient).mockReturnValue(admin as never);

    await completeMockCheckout({ refId: REF_ID, outcome: "failed" });

    expect(finalizePaymentTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        refId: REF_ID,
        resolvedStatus: "failed",
        failureReason: "DEVELOPMENT_MOCK_FAILED",
      }),
    );
  });
});
