import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));
vi.mock("@simplewebauthn/server", () => ({
  generateRegistrationOptions: vi.fn(),
  verifyRegistrationResponse: vi.fn(),
  generateAuthenticationOptions: vi.fn(),
  verifyAuthenticationResponse: vi.fn(),
}));

const { createAdminClient } = await import("@/lib/supabase/admin");
const { generateRegistrationOptions, verifyRegistrationResponse, generateAuthenticationOptions, verifyAuthenticationResponse } = await import(
  "@simplewebauthn/server"
);
const { hasPasskey, buildRegistrationOptions, verifyRegistration, buildAuthenticationOptions, verifyAuthentication } = await import(
  "@/features/auth/server/webauthn"
);

const USER_ID = "11111111-1111-1111-1111-111111111111";

function makeFakeAdmin(fromImpl: (table: string) => unknown) {
  return { from: vi.fn(fromImpl) };
}

beforeEach(() => {
  vi.mocked(createAdminClient).mockReset();
  vi.mocked(generateRegistrationOptions).mockReset();
  vi.mocked(verifyRegistrationResponse).mockReset();
  vi.mocked(generateAuthenticationOptions).mockReset();
  vi.mocked(verifyAuthenticationResponse).mockReset();
});

describe("hasPasskey", () => {
  it("is true when at least one credential is registered", async () => {
    const admin = makeFakeAdmin(() => ({
      select: () => ({ eq: () => Promise.resolve({ count: 2 }) }),
    }));
    vi.mocked(createAdminClient).mockReturnValue(admin as never);

    await expect(hasPasskey(USER_ID)).resolves.toBe(true);
  });

  it("is false when no credential is registered", async () => {
    const admin = makeFakeAdmin(() => ({
      select: () => ({ eq: () => Promise.resolve({ count: 0 }) }),
    }));
    vi.mocked(createAdminClient).mockReturnValue(admin as never);

    await expect(hasPasskey(USER_ID)).resolves.toBe(false);
  });
});

describe("buildRegistrationOptions", () => {
  it("derives rpID/rpName from NEXT_PUBLIC_APP_URL and excludes existing credentials", async () => {
    const admin = makeFakeAdmin(() => ({
      select: () => ({ eq: () => Promise.resolve({ data: [{ credential_id: "cred-1", transports: ["internal"] }] }) }),
    }));
    vi.mocked(createAdminClient).mockReturnValue(admin as never);
    vi.mocked(generateRegistrationOptions).mockResolvedValue({ challenge: "chal" } as never);

    await buildRegistrationOptions(USER_ID, "louai");

    expect(generateRegistrationOptions).toHaveBeenCalledWith(
      expect.objectContaining({
        rpName: "Mou3amla",
        rpID: "localhost",
        userName: "louai",
        excludeCredentials: [{ id: "cred-1", transports: ["internal"] }],
      }),
    );
  });
});

describe("verifyRegistration", () => {
  it("returns a friendly message when verification fails", async () => {
    vi.mocked(verifyRegistrationResponse).mockResolvedValue({ verified: false } as never);
    const admin = makeFakeAdmin(() => ({ insert: vi.fn() }));
    vi.mocked(createAdminClient).mockReturnValue(admin as never);

    const result = await verifyRegistration(USER_ID, "chal", {} as never);

    expect(result).toEqual({ ok: false, message: expect.any(String) });
    expect(admin.from).not.toHaveBeenCalled();
  });

  it("returns a friendly message instead of throwing when verifyRegistrationResponse throws", async () => {
    vi.mocked(verifyRegistrationResponse).mockRejectedValue(new Error("bad request"));

    const result = await verifyRegistration(USER_ID, "chal", {} as never);

    expect(result).toEqual({ ok: false, message: expect.any(String) });
  });

  it("stores the credential on success", async () => {
    vi.mocked(verifyRegistrationResponse).mockResolvedValue({
      verified: true,
      registrationInfo: {
        credential: { id: "cred-1", publicKey: new Uint8Array([1, 2, 3]), counter: 0, transports: ["internal"] },
        credentialDeviceType: "singleDevice",
        credentialBackedUp: false,
      },
    } as never);
    const insert = vi.fn().mockResolvedValue({ error: null });
    const admin = makeFakeAdmin(() => ({ insert }));
    vi.mocked(createAdminClient).mockReturnValue(admin as never);

    const result = await verifyRegistration(USER_ID, "chal", {} as never);

    expect(result).toEqual({ ok: true });
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: USER_ID, credential_id: "cred-1", counter: 0, device_type: "singleDevice", backed_up: false }),
    );
  });
});

describe("buildAuthenticationOptions", () => {
  it("returns null when the identity has no registered credential", async () => {
    const admin = makeFakeAdmin(() => ({
      select: () => ({ eq: () => Promise.resolve({ data: [] }) }),
    }));
    vi.mocked(createAdminClient).mockReturnValue(admin as never);

    await expect(buildAuthenticationOptions(USER_ID)).resolves.toBeNull();
    expect(generateAuthenticationOptions).not.toHaveBeenCalled();
  });

  it("builds options scoped to the identity's own credentials", async () => {
    const admin = makeFakeAdmin(() => ({
      select: () => ({ eq: () => Promise.resolve({ data: [{ credential_id: "cred-1", transports: null }] }) }),
    }));
    vi.mocked(createAdminClient).mockReturnValue(admin as never);
    vi.mocked(generateAuthenticationOptions).mockResolvedValue({ challenge: "chal" } as never);

    await buildAuthenticationOptions(USER_ID);

    expect(generateAuthenticationOptions).toHaveBeenCalledWith(
      expect.objectContaining({ rpID: "localhost", allowCredentials: [{ id: "cred-1", transports: undefined }] }),
    );
  });
});

describe("verifyAuthentication", () => {
  it("rejects when the credential can't be found for this identity", async () => {
    const admin = makeFakeAdmin(() => ({
      select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: null }) }) }) }),
    }));
    vi.mocked(createAdminClient).mockReturnValue(admin as never);

    const result = await verifyAuthentication(USER_ID, "chal", { id: "cred-1" } as never);

    expect(result).toEqual({ ok: false, message: expect.any(String) });
    expect(verifyAuthenticationResponse).not.toHaveBeenCalled();
  });

  it("updates the counter on successful verification", async () => {
    const update = vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) }));
    const admin = makeFakeAdmin((table: string) => {
      if (table !== "passkeys") throw new Error(`unexpected table ${table}`);
      return {
        select: () => ({
          eq: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: { credential_id: "cred-1", public_key: Buffer.from([1, 2, 3]).toString("base64"), counter: 0, transports: null }, error: null }) }) }),
        }),
        update,
      };
    });
    vi.mocked(createAdminClient).mockReturnValue(admin as never);
    vi.mocked(verifyAuthenticationResponse).mockResolvedValue({
      verified: true,
      authenticationInfo: { newCounter: 1 },
    } as never);

    const result = await verifyAuthentication(USER_ID, "chal", { id: "cred-1" } as never);

    expect(result).toEqual({ ok: true });
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ counter: 1 }));
  });
});
