import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/rate-limit", () => ({ checkRateLimit: vi.fn() }));
vi.mock("@/lib/request-ip", () => ({ getClientIp: vi.fn() }));
vi.mock("@/features/auth/server/passkey-bridge", () => ({
  setPasskeyModeCookie: vi.fn(),
  setChallengeCookie: vi.fn(),
  readChallengeCookie: vi.fn(),
  clearChallengeCookie: vi.fn(),
}));
vi.mock("@/features/auth/server/webauthn", () => ({
  hasPasskey: vi.fn(),
  buildRegistrationOptions: vi.fn(),
  verifyRegistration: vi.fn(),
  buildAuthenticationOptions: vi.fn(),
  verifyAuthentication: vi.fn(),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
}));

const { createAdminClient } = await import("@/lib/supabase/admin");
const { createClient } = await import("@/lib/supabase/server");
const { checkRateLimit } = await import("@/lib/rate-limit");
const { getClientIp } = await import("@/lib/request-ip");
const { setPasskeyModeCookie, setChallengeCookie, readChallengeCookie, clearChallengeCookie } = await import("@/features/auth/server/passkey-bridge");
const { hasPasskey, buildRegistrationOptions, verifyRegistration, buildAuthenticationOptions, verifyAuthentication } = await import(
  "@/features/auth/server/webauthn"
);
const { revalidatePath } = await import("next/cache");
const {
  startPhoneAuth,
  getPasskeyRegistrationOptions,
  verifyPasskeyRegistration,
  getPasskeyAuthenticationOptions,
  verifyPasskeyAuthentication,
} = await import("@/features/auth/server/actions");

const PHONE_DIGITS = "20123456";
const NORMALIZED_PHONE = "+21620123456";
const USERNAME = "louai";
const USER_ID = "11111111-1111-1111-1111-111111111111";

/** A minimal, awaitable Supabase query-builder fake. One `.from(...)` call
 * dequeues the next configured `{data, error}` result, regardless of which
 * chained method (`.maybeSingle()` or the builder itself) the caller
 * eventually awaits - matches this file's actual usage exactly without
 * needing a general-purpose Supabase mock. */
function makeFrom(queue: unknown[]) {
  return vi.fn(() => {
    const result = queue.shift() ?? { data: null, error: null };
    const builder: Record<string, unknown> = {
      select: () => builder,
      insert: () => builder,
      update: () => builder,
      eq: () => builder,
      or: () => builder,
      order: () => builder,
      limit: () => builder,
      neq: () => builder,
      in: () => builder,
      maybeSingle: () => Promise.resolve(result),
      then: (resolve: (value: unknown) => void, reject?: (reason: unknown) => void) => Promise.resolve(result).then(resolve, reject),
    };
    return builder;
  });
}

function makeFakeAdmin(options: {
  fromQueue?: unknown[];
  createUser?: unknown;
  listUsers?: unknown;
  generateLink?: unknown;
} = {}) {
  return {
    from: makeFrom(options.fromQueue ?? []),
    auth: {
      admin: {
        createUser: vi.fn().mockResolvedValue(options.createUser ?? { data: { user: { id: USER_ID } }, error: null }),
        listUsers: vi.fn().mockResolvedValue(options.listUsers ?? { data: { users: [] }, error: null }),
        generateLink: vi.fn().mockResolvedValue(options.generateLink ?? { data: { properties: { hashed_token: "token-hash-abc" } }, error: null }),
      },
    },
  };
}

function makeFakeServerClient(options: { verifyOtp?: unknown } = {}) {
  return {
    auth: {
      verifyOtp: vi.fn().mockResolvedValue(options.verifyOtp ?? { error: null }),
    },
  };
}

function landingFormData(phone = PHONE_DIGITS, username = USERNAME) {
  const formData = new FormData();
  formData.set("phone", phone);
  formData.set("username", username);
  return formData;
}

beforeEach(() => {
  vi.mocked(checkRateLimit).mockReset().mockResolvedValue(true);
  vi.mocked(getClientIp).mockReset().mockResolvedValue("203.0.113.1");
  vi.mocked(setPasskeyModeCookie).mockReset().mockResolvedValue(undefined);
  vi.mocked(setChallengeCookie).mockReset().mockResolvedValue(undefined);
  vi.mocked(readChallengeCookie).mockReset();
  vi.mocked(clearChallengeCookie).mockReset().mockResolvedValue(undefined);
  vi.mocked(hasPasskey).mockReset();
  vi.mocked(buildRegistrationOptions).mockReset();
  vi.mocked(verifyRegistration).mockReset();
  vi.mocked(buildAuthenticationOptions).mockReset();
  vi.mocked(verifyAuthentication).mockReset();
  vi.mocked(createAdminClient).mockReset();
  vi.mocked(createClient).mockReset();
});

describe("startPhoneAuth", () => {
  it("returns field errors for an invalid phone/username without touching the database", async () => {
    const result = await startPhoneAuth(undefined, landingFormData("123", "ab"));

    expect(result?.errors?.phone).toBeDefined();
    expect(result?.errors?.username).toBeDefined();
    expect(createAdminClient).not.toHaveBeenCalled();
  });

  it("rejects with a friendly message when rate-limited, before any database call", async () => {
    vi.mocked(checkRateLimit).mockResolvedValue(false);

    const result = await startPhoneAuth(undefined, landingFormData());

    expect(result?.message).toMatch(/too many attempts/i);
    expect(createAdminClient).not.toHaveBeenCalled();
  });

  it("creates a new identity and offers registration for a phone/username never seen before", async () => {
    const admin = makeFakeAdmin({
      fromQueue: [
        { data: [], error: null }, // initial lookup: no existing profile
        { error: null }, // profile insert succeeds
      ],
    });
    vi.mocked(createAdminClient).mockReturnValue(admin as never);
    vi.mocked(hasPasskey).mockResolvedValue(false);

    await expect(startPhoneAuth(undefined, landingFormData())).rejects.toThrow(
      `REDIRECT:/verify?${new URLSearchParams({ phone: NORMALIZED_PHONE, username: USERNAME })}`,
    );

    expect(admin.auth.admin.createUser).toHaveBeenCalledOnce();
    expect(admin.auth.admin.generateLink).not.toHaveBeenCalled();
    expect(setPasskeyModeCookie).toHaveBeenCalledWith(
      expect.objectContaining({ phone: NORMALIZED_PHONE, username: USERNAME, mode: "register" }),
    );
  });

  it("signs an existing identity straight in when it already has a registered passkey", async () => {
    const admin = makeFakeAdmin({
      fromQueue: [{ data: [{ id: USER_ID, phone: NORMALIZED_PHONE, username: USERNAME, verification_status: "unverified" }], error: null }],
    });
    vi.mocked(createAdminClient).mockReturnValue(admin as never);
    vi.mocked(hasPasskey).mockResolvedValue(true);

    await expect(startPhoneAuth(undefined, landingFormData())).rejects.toThrow("REDIRECT:/verify?");

    expect(admin.auth.admin.createUser).not.toHaveBeenCalled();
    expect(setPasskeyModeCookie).toHaveBeenCalledWith(expect.objectContaining({ mode: "authenticate" }));
  });

  it("re-offers registration for an existing identity that never finished setting up a passkey", async () => {
    // The bug this fixed: deciding register-vs-authenticate from "does a
    // profile row exist" instead of "does a passkey exist" stranded anyone
    // who abandoned the ceremony mid-registration.
    const admin = makeFakeAdmin({
      fromQueue: [{ data: [{ id: USER_ID, phone: NORMALIZED_PHONE, username: USERNAME, verification_status: "unverified" }], error: null }],
    });
    vi.mocked(createAdminClient).mockReturnValue(admin as never);
    vi.mocked(hasPasskey).mockResolvedValue(false);

    await expect(startPhoneAuth(undefined, landingFormData())).rejects.toThrow("REDIRECT:/verify?");

    expect(admin.auth.admin.createUser).not.toHaveBeenCalled();
    expect(setPasskeyModeCookie).toHaveBeenCalledWith(expect.objectContaining({ mode: "register" }));
  });

  it("returns a friendly message instead of throwing when the database call errors unexpectedly", async () => {
    vi.mocked(createAdminClient).mockImplementation(() => {
      throw new Error("connection reset");
    });

    const result = await startPhoneAuth(undefined, landingFormData());

    expect(result).toEqual({ message: expect.any(String) });
  });

  it("rejects when the phone and username resolve to two different identities", async () => {
    const admin = makeFakeAdmin({
      fromQueue: [
        {
          data: [
            { id: "profile-a", phone: NORMALIZED_PHONE, username: "someoneelse", verification_status: "unverified" },
            { id: "profile-b", phone: "+21611111111", username: USERNAME, verification_status: "unverified" },
          ],
          error: null,
        },
      ],
    });
    vi.mocked(createAdminClient).mockReturnValue(admin as never);

    const result = await startPhoneAuth(undefined, landingFormData());

    expect(result?.message).toMatch(/two different mou3amla accounts/i);
    expect(admin.auth.admin.createUser).not.toHaveBeenCalled();
  });

  it("rejects a known phone paired with a handle that isn't its own, without revealing the real handle", async () => {
    const admin = makeFakeAdmin({
      fromQueue: [{ data: [{ id: "profile-a", phone: NORMALIZED_PHONE, username: "someoneelse", verification_status: "unverified" }], error: null }],
    });
    vi.mocked(createAdminClient).mockReturnValue(admin as never);

    const result = await startPhoneAuth(undefined, landingFormData());

    expect(result?.message).toMatch(/already linked to a mou3amla account under a different handle/i);
    expect(result?.message).not.toContain("someoneelse");
    expect(admin.auth.admin.createUser).not.toHaveBeenCalled();
  });

  it("rejects a known handle paired with a phone that isn't its own, without revealing the real phone", async () => {
    const admin = makeFakeAdmin({
      fromQueue: [{ data: [{ id: "profile-a", phone: "+21611111111", username: USERNAME, verification_status: "unverified" }], error: null }],
    });
    vi.mocked(createAdminClient).mockReturnValue(admin as never);

    const result = await startPhoneAuth(undefined, landingFormData());

    expect(result?.message).toMatch(/that handle is already taken/i);
    expect(result?.message).not.toContain("21611111111");
    expect(admin.auth.admin.createUser).not.toHaveBeenCalled();
  });
});

describe("getPasskeyRegistrationOptions", () => {
  it("requires a resolvable identity", async () => {
    const admin = makeFakeAdmin({ fromQueue: [{ data: null, error: null }] });
    vi.mocked(createAdminClient).mockReturnValue(admin as never);

    const result = await getPasskeyRegistrationOptions(NORMALIZED_PHONE, USERNAME);

    expect(result).toEqual({ ok: false, message: expect.any(String) });
    expect(buildRegistrationOptions).not.toHaveBeenCalled();
  });

  it("builds options and stores the challenge", async () => {
    const admin = makeFakeAdmin({ fromQueue: [{ data: { id: USER_ID }, error: null }] });
    vi.mocked(createAdminClient).mockReturnValue(admin as never);
    vi.mocked(buildRegistrationOptions).mockResolvedValue({ challenge: "chal-1" } as never);

    const result = await getPasskeyRegistrationOptions(NORMALIZED_PHONE, USERNAME);

    expect(result).toEqual({ ok: true, options: { challenge: "chal-1" } });
    expect(setChallengeCookie).toHaveBeenCalledWith(
      expect.objectContaining({ phone: NORMALIZED_PHONE, username: USERNAME, challenge: "chal-1" }),
    );
  });
});

describe("verifyPasskeyRegistration", () => {
  it("rejects when the challenge cookie is missing", async () => {
    const admin = makeFakeAdmin({ fromQueue: [{ data: { id: USER_ID }, error: null }] });
    vi.mocked(createAdminClient).mockReturnValue(admin as never);
    vi.mocked(readChallengeCookie).mockResolvedValue(null);

    const result = await verifyPasskeyRegistration(NORMALIZED_PHONE, USERNAME, {} as never);

    expect(result).toEqual({ ok: false, message: expect.stringMatching(/expired/i) });
    expect(verifyRegistration).not.toHaveBeenCalled();
  });

  it("returns the verification failure message without minting a session", async () => {
    const admin = makeFakeAdmin({ fromQueue: [{ data: { id: USER_ID }, error: null }] });
    vi.mocked(createAdminClient).mockReturnValue(admin as never);
    vi.mocked(readChallengeCookie).mockResolvedValue("chal-1");
    vi.mocked(verifyRegistration).mockResolvedValue({ ok: false, message: "nope" });

    const result = await verifyPasskeyRegistration(NORMALIZED_PHONE, USERNAME, {} as never);

    expect(result).toEqual({ ok: false, message: "nope" });
    expect(admin.auth.admin.generateLink).not.toHaveBeenCalled();
  });

  it("mints a session and redirects home on success", async () => {
    const admin = makeFakeAdmin({ fromQueue: [{ data: { id: USER_ID }, error: null }] });
    vi.mocked(createAdminClient).mockReturnValue(admin as never);
    vi.mocked(createClient).mockResolvedValue(makeFakeServerClient() as never);
    vi.mocked(readChallengeCookie).mockResolvedValue("chal-1");
    vi.mocked(verifyRegistration).mockResolvedValue({ ok: true });

    await expect(verifyPasskeyRegistration(NORMALIZED_PHONE, USERNAME, {} as never)).rejects.toThrow("REDIRECT:/home");

    expect(admin.auth.admin.generateLink).toHaveBeenCalledWith(expect.objectContaining({ type: "magiclink" }));
    expect(clearChallengeCookie).toHaveBeenCalledOnce();
    expect(revalidatePath).toHaveBeenCalledWith("/home");
  });
});

describe("getPasskeyAuthenticationOptions", () => {
  it("rejects when no passkey exists for this identity", async () => {
    const admin = makeFakeAdmin({ fromQueue: [{ data: { id: USER_ID }, error: null }] });
    vi.mocked(createAdminClient).mockReturnValue(admin as never);
    vi.mocked(buildAuthenticationOptions).mockResolvedValue(null);

    const result = await getPasskeyAuthenticationOptions(NORMALIZED_PHONE, USERNAME);

    expect(result).toEqual({ ok: false, message: expect.any(String) });
    expect(setChallengeCookie).not.toHaveBeenCalled();
  });

  it("builds options and stores the challenge", async () => {
    const admin = makeFakeAdmin({ fromQueue: [{ data: { id: USER_ID }, error: null }] });
    vi.mocked(createAdminClient).mockReturnValue(admin as never);
    vi.mocked(buildAuthenticationOptions).mockResolvedValue({ challenge: "chal-2" } as never);

    const result = await getPasskeyAuthenticationOptions(NORMALIZED_PHONE, USERNAME);

    expect(result).toEqual({ ok: true, options: { challenge: "chal-2" } });
    expect(setChallengeCookie).toHaveBeenCalledWith(expect.objectContaining({ challenge: "chal-2" }));
  });
});

describe("verifyPasskeyAuthentication", () => {
  it("mints a session and redirects home on success", async () => {
    const admin = makeFakeAdmin({ fromQueue: [{ data: { id: USER_ID }, error: null }] });
    vi.mocked(createAdminClient).mockReturnValue(admin as never);
    vi.mocked(createClient).mockResolvedValue(makeFakeServerClient() as never);
    vi.mocked(readChallengeCookie).mockResolvedValue("chal-2");
    vi.mocked(verifyAuthentication).mockResolvedValue({ ok: true });

    await expect(verifyPasskeyAuthentication(NORMALIZED_PHONE, USERNAME, {} as never)).rejects.toThrow("REDIRECT:/home");

    expect(clearChallengeCookie).toHaveBeenCalledOnce();
  });

  it("returns the verification failure message without minting a session", async () => {
    const admin = makeFakeAdmin({ fromQueue: [{ data: { id: USER_ID }, error: null }] });
    vi.mocked(createAdminClient).mockReturnValue(admin as never);
    vi.mocked(readChallengeCookie).mockResolvedValue("chal-2");
    vi.mocked(verifyAuthentication).mockResolvedValue({ ok: false, message: "nope" });

    const result = await verifyPasskeyAuthentication(NORMALIZED_PHONE, USERNAME, {} as never);

    expect(result).toEqual({ ok: false, message: "nope" });
    expect(admin.auth.admin.generateLink).not.toHaveBeenCalled();
  });
});
