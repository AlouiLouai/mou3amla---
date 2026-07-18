import { beforeEach, describe, expect, it, vi } from "vitest";

type FakeCookie = { value: string };

const store = new Map<string, FakeCookie>();

vi.mock("next/headers", () => ({
  cookies: () =>
    Promise.resolve({
      get: (name: string) => store.get(name),
      set: (name: string, value: string) => {
        store.set(name, { value });
      },
    }),
}));

const { clearPasskeyBridgeCookie, readPasskeyBridgeCookie, setPasskeyBridgeCookie } = await import("@/features/auth/server/passkey-bridge");

const PHONE = "+21620123456";
const USERNAME = "louai";

describe("passkey bridge cookie", () => {
  beforeEach(() => {
    store.clear();
  });

  it("round-trips a register-mode payload with its token hash", async () => {
    await setPasskeyBridgeCookie({ phone: PHONE, username: USERNAME, mode: "register", tokenHash: "abc123" });

    const result = await readPasskeyBridgeCookie(PHONE, USERNAME);

    expect(result).toEqual({ phone: PHONE, username: USERNAME, mode: "register", tokenHash: "abc123" });
  });

  it("round-trips an authenticate-mode payload with no token hash", async () => {
    await setPasskeyBridgeCookie({ phone: PHONE, username: USERNAME, mode: "authenticate" });

    const result = await readPasskeyBridgeCookie(PHONE, USERNAME);

    expect(result?.mode).toBe("authenticate");
    expect(result?.tokenHash).toBeUndefined();
  });

  it("normalizes the username (case, leading @) on both write and read", async () => {
    await setPasskeyBridgeCookie({ phone: PHONE, username: "@Louai", mode: "authenticate" });

    expect(await readPasskeyBridgeCookie(PHONE, "louai")).not.toBeNull();
    expect(await readPasskeyBridgeCookie(PHONE, "LOUAI")).not.toBeNull();
  });

  it("returns null if the phone doesn't match the stored cookie", async () => {
    await setPasskeyBridgeCookie({ phone: PHONE, username: USERNAME, mode: "authenticate" });

    expect(await readPasskeyBridgeCookie("+21699999999", USERNAME)).toBeNull();
  });

  it("returns null if the username doesn't match the stored cookie", async () => {
    await setPasskeyBridgeCookie({ phone: PHONE, username: USERNAME, mode: "authenticate" });

    expect(await readPasskeyBridgeCookie(PHONE, "someoneelse")).toBeNull();
  });

  it("returns null once cleared", async () => {
    await setPasskeyBridgeCookie({ phone: PHONE, username: USERNAME, mode: "authenticate" });
    await clearPasskeyBridgeCookie();

    expect(await readPasskeyBridgeCookie(PHONE, USERNAME)).toBeNull();
  });

  it("returns null for malformed cookie content instead of throwing", async () => {
    store.set("mou3amla-passkey-bridge", { value: "{not json" });

    expect(await readPasskeyBridgeCookie(PHONE, USERNAME)).toBeNull();
  });
});
