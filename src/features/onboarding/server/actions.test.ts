import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));
vi.mock("@/features/auth/server/dal", () => ({ getCurrentAppUser: vi.fn() }));
vi.mock("@/lib/rate-limit", () => ({ checkRateLimit: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const { createAdminClient } = await import("@/lib/supabase/admin");
const { getCurrentAppUser } = await import("@/features/auth/server/dal");
const { checkRateLimit } = await import("@/lib/rate-limit");
const { runDemoVerification } = await import("@/features/onboarding/server/actions");

const USER_ID = "11111111-1111-1111-1111-111111111111";

function makeFakeAdmin() {
  const insert = vi.fn().mockResolvedValue({ data: null, error: null });
  const update = vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ data: null, error: null }) }));
  return { from: vi.fn(() => ({ insert, update })), insert, update };
}

describe("runDemoVerification", () => {
  beforeEach(() => {
    vi.mocked(createAdminClient).mockReset();
    vi.mocked(getCurrentAppUser).mockReset();
    vi.mocked(checkRateLimit).mockReset().mockResolvedValue(true);
  });

  it("requires a signed-in user", async () => {
    vi.mocked(getCurrentAppUser).mockResolvedValue(null);

    const result = await runDemoVerification();

    expect(result).toEqual({ ok: false, message: expect.stringMatching(/signed in/i) });
  });

  it("is a no-op success for an already-verified user", async () => {
    vi.mocked(getCurrentAppUser).mockResolvedValue({ id: USER_ID, verificationStatus: "verified" } as never);

    const result = await runDemoVerification();

    expect(result).toEqual({ ok: true });
    expect(createAdminClient).not.toHaveBeenCalled();
  });

  it("rejects with a friendly message when rate-limited, before touching the database", async () => {
    vi.mocked(getCurrentAppUser).mockResolvedValue({ id: USER_ID, verificationStatus: "unverified" } as never);
    vi.mocked(checkRateLimit).mockResolvedValue(false);

    const result = await runDemoVerification();

    expect(result?.ok).toBe(false);
    expect(createAdminClient).not.toHaveBeenCalled();
  });

  it("returns a friendly message instead of throwing when the database call errors unexpectedly", async () => {
    vi.mocked(getCurrentAppUser).mockResolvedValue({ id: USER_ID, verificationStatus: "unverified" } as never);
    vi.mocked(createAdminClient).mockImplementation(() => {
      throw new Error("connection reset");
    });

    const result = await runDemoVerification();

    expect(result).toEqual({ ok: false, message: expect.any(String) });
  });

  it("marks the profile verified and logs a demo_kyc audit event", async () => {
    vi.mocked(getCurrentAppUser).mockResolvedValue({ id: USER_ID, verificationStatus: "unverified" } as never);
    const admin = makeFakeAdmin();
    vi.mocked(createAdminClient).mockReturnValue(admin as never);

    const result = await runDemoVerification();

    expect(result).toEqual({ ok: true });
    expect(admin.update).toHaveBeenCalledWith(
      expect.objectContaining({ verification_status: "verified", kyc_provider_status: "Demo Approved" }),
    );
    expect(admin.insert).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: USER_ID, source: "demo_kyc", next_status: "verified", previous_status: "unverified" }),
    );
  });
});
