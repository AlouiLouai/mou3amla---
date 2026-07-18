import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));
vi.mock("@/features/auth/server/dal", () => ({ getCurrentAppUser: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const envState = { KYC_DEMO_MODE: true };
vi.mock("@/config/env.server", () => ({
  get serverEnv() {
    return envState;
  },
}));

const { createAdminClient } = await import("@/lib/supabase/admin");
const { getCurrentAppUser } = await import("@/features/auth/server/dal");
const { runDemoVerification } = await import("@/features/onboarding/server/actions");

const USER_ID = "11111111-1111-1111-1111-111111111111";

function makeFakeAdmin() {
  const insert = vi.fn().mockResolvedValue({ data: null, error: null });
  const update = vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ data: null, error: null }) }));
  return { from: vi.fn(() => ({ insert, update })), insert, update };
}

describe("runDemoVerification", () => {
  beforeEach(() => {
    envState.KYC_DEMO_MODE = true;
    vi.mocked(createAdminClient).mockReset();
    vi.mocked(getCurrentAppUser).mockReset();
  });

  it("refuses to run when KYC_DEMO_MODE is off", async () => {
    envState.KYC_DEMO_MODE = false;

    const result = await runDemoVerification();

    expect(result).toEqual({ ok: false, message: expect.stringMatching(/not enabled/i) });
    expect(getCurrentAppUser).not.toHaveBeenCalled();
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

  it("marks the profile verified and logs a demo_kyc audit event", async () => {
    vi.mocked(getCurrentAppUser).mockResolvedValue({ id: USER_ID, verificationStatus: "unverified" } as never);
    const admin = makeFakeAdmin();
    vi.mocked(createAdminClient).mockReturnValue(admin as never);

    const result = await runDemoVerification();

    expect(result).toEqual({ ok: true });
    expect(admin.update).toHaveBeenCalledWith(
      expect.objectContaining({ verification_status: "verified", didit_latest_status: "Demo Approved" }),
    );
    expect(admin.insert).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: USER_ID, source: "demo_kyc", next_status: "verified", previous_status: "unverified" }),
    );
  });
});
