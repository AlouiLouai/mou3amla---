import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/rate-limit", () => ({ checkRateLimit: vi.fn() }));
vi.mock("@/lib/request-ip", () => ({ getClientIp: vi.fn() }));
vi.mock("@/features/auth/server/passkey-bridge", () => ({
  setPasskeyBridgeCookie: vi.fn(),
  readPasskeyBridgeCookie: vi.fn(),
  clearPasskeyBridgeCookie: vi.fn(),
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
const { setPasskeyBridgeCookie } = await import("@/features/auth/server/passkey-bridge");
const { revalidatePath } = await import("next/cache");
const { startPhoneAuth, finalizeAuth } = await import("@/features/auth/server/actions");

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
  listPasskeys?: unknown;
  generateLink?: unknown;
} = {}) {
  return {
    from: makeFrom(options.fromQueue ?? []),
    auth: {
      admin: {
        createUser: vi.fn().mockResolvedValue(options.createUser ?? { data: { user: { id: USER_ID } }, error: null }),
        listUsers: vi.fn().mockResolvedValue(options.listUsers ?? { data: { users: [] }, error: null }),
        generateLink: vi.fn().mockResolvedValue(options.generateLink ?? { data: { properties: { hashed_token: "token-hash-abc" } }, error: null }),
        passkey: {
          listPasskeys: vi.fn().mockResolvedValue(options.listPasskeys ?? { data: [], error: null }),
        },
      },
    },
  };
}

function makeFakeServerClient(options: { getClaims?: unknown; verifyOtp?: unknown; signOut?: unknown } = {}) {
  return {
    auth: {
      getClaims: vi.fn().mockResolvedValue(options.getClaims ?? { data: null, error: new Error("no session") }),
      verifyOtp: vi.fn().mockResolvedValue(options.verifyOtp ?? { error: null }),
      signOut: vi.fn().mockResolvedValue(options.signOut ?? { error: null }),
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
  vi.mocked(checkRateLimit).mockResolvedValue(true);
  vi.mocked(getClientIp).mockResolvedValue("203.0.113.1");
  vi.mocked(setPasskeyBridgeCookie).mockResolvedValue(undefined);
});

describe("startPhoneAuth", () => {
  it("returns field errors for an invalid phone/username without touching the database", async () => {
    vi.mocked(createAdminClient).mockClear();

    const result = await startPhoneAuth(undefined, landingFormData("123", "ab"));

    expect(result?.errors?.phone).toBeDefined();
    expect(result?.errors?.username).toBeDefined();
    expect(createAdminClient).not.toHaveBeenCalled();
  });

  it("rejects with a friendly message when rate-limited, before any database call", async () => {
    vi.mocked(checkRateLimit).mockResolvedValue(false);
    vi.mocked(createAdminClient).mockClear();

    const result = await startPhoneAuth(undefined, landingFormData());

    expect(result?.message).toMatch(/too many attempts/i);
    expect(createAdminClient).not.toHaveBeenCalled();
  });

  it("creates a new identity and registers a passkey-setup bridge for a phone/username never seen before", async () => {
    const admin = makeFakeAdmin({
      fromQueue: [
        { data: [], error: null }, // initial lookup: no existing profile
        { error: null }, // profile insert succeeds
      ],
      listPasskeys: { data: [], error: null }, // brand new user, no passkey yet
    });
    vi.mocked(createAdminClient).mockReturnValue(admin as never);

    await expect(startPhoneAuth(undefined, landingFormData())).rejects.toThrow(
      `REDIRECT:/verify?${new URLSearchParams({ phone: NORMALIZED_PHONE, username: USERNAME })}`,
    );

    expect(admin.auth.admin.createUser).toHaveBeenCalledOnce();
    expect(admin.auth.admin.generateLink).toHaveBeenCalledWith(expect.objectContaining({ type: "magiclink" }));
    expect(setPasskeyBridgeCookie).toHaveBeenCalledWith(
      expect.objectContaining({ phone: NORMALIZED_PHONE, username: USERNAME, mode: "register", tokenHash: "token-hash-abc" }),
    );
  });

  it("signs an existing identity straight in when it already has a registered passkey", async () => {
    const admin = makeFakeAdmin({
      fromQueue: [{ data: [{ id: USER_ID, phone: NORMALIZED_PHONE, username: USERNAME, verification_status: "unverified" }], error: null }],
      listPasskeys: { data: [{ id: "pk-1" }], error: null },
    });
    vi.mocked(createAdminClient).mockReturnValue(admin as never);

    await expect(startPhoneAuth(undefined, landingFormData())).rejects.toThrow("REDIRECT:/verify?");

    expect(admin.auth.admin.createUser).not.toHaveBeenCalled();
    expect(admin.auth.admin.generateLink).not.toHaveBeenCalled();
    expect(setPasskeyBridgeCookie).toHaveBeenCalledWith(expect.objectContaining({ mode: "authenticate" }));
  });

  it("re-offers registration for an existing identity that never finished setting up a passkey", async () => {
    // The bug this fixed: deciding register-vs-authenticate from "does a
    // profile row exist" instead of "does a passkey exist" stranded anyone
    // who abandoned the biometric prompt mid-registration.
    const admin = makeFakeAdmin({
      fromQueue: [{ data: [{ id: USER_ID, phone: NORMALIZED_PHONE, username: USERNAME, verification_status: "unverified" }], error: null }],
      listPasskeys: { data: [], error: null },
    });
    vi.mocked(createAdminClient).mockReturnValue(admin as never);

    await expect(startPhoneAuth(undefined, landingFormData())).rejects.toThrow("REDIRECT:/verify?");

    expect(admin.auth.admin.createUser).not.toHaveBeenCalled();
    expect(admin.auth.admin.generateLink).toHaveBeenCalledOnce();
    expect(setPasskeyBridgeCookie).toHaveBeenCalledWith(expect.objectContaining({ mode: "register" }));
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

    expect(result?.message).toMatch(/don't belong to the same/i);
    expect(admin.auth.admin.createUser).not.toHaveBeenCalled();
  });
});

describe("finalizeAuth", () => {
  it("returns a friendly error when no session came through", async () => {
    vi.mocked(createClient).mockResolvedValue(makeFakeServerClient() as never);

    const result = await finalizeAuth(NORMALIZED_PHONE, USERNAME);

    expect(result).toEqual({ ok: false, message: expect.stringMatching(/didn't come through/i) });
  });

  it("signs out and rejects when the session belongs to a different identity", async () => {
    const server = makeFakeServerClient({ getClaims: { data: { claims: { sub: USER_ID } }, error: null } });
    vi.mocked(createClient).mockResolvedValue(server as never);

    const admin = makeFakeAdmin({
      fromQueue: [{ data: { id: USER_ID, phone: "+21699999999", username: "someoneelse" }, error: null }],
    });
    vi.mocked(createAdminClient).mockReturnValue(admin as never);

    const result = await finalizeAuth(NORMALIZED_PHONE, USERNAME);

    expect(server.auth.signOut).toHaveBeenCalledOnce();
    expect(result).toEqual({ ok: false, message: expect.stringMatching(/different .* identity/i) });
  });

  it("clears the bridge and redirects home when the session matches the typed identity", async () => {
    const server = makeFakeServerClient({ getClaims: { data: { claims: { sub: USER_ID } }, error: null } });
    vi.mocked(createClient).mockResolvedValue(server as never);

    const admin = makeFakeAdmin({
      fromQueue: [{ data: { id: USER_ID, phone: NORMALIZED_PHONE, username: USERNAME }, error: null }],
    });
    vi.mocked(createAdminClient).mockReturnValue(admin as never);

    await expect(finalizeAuth(NORMALIZED_PHONE, USERNAME)).rejects.toThrow("REDIRECT:/home");

    expect(revalidatePath).toHaveBeenCalledWith("/home");
    expect(server.auth.signOut).not.toHaveBeenCalled();
  });
});
