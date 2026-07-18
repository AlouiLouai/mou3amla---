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

const { setPasskeyModeCookie, readPasskeyModeCookie, setChallengeCookie, readChallengeCookie, clearChallengeCookie } = await import(
  "@/features/auth/server/passkey-bridge"
);

const PHONE = "+21620123456";
const USERNAME = "louai";

describe("passkey mode cookie", () => {
  beforeEach(() => {
    store.clear();
  });

  it("round-trips a register mode", async () => {
    await setPasskeyModeCookie({ phone: PHONE, username: USERNAME, mode: "register" });

    expect(await readPasskeyModeCookie(PHONE, USERNAME)).toBe("register");
  });

  it("round-trips an authenticate mode", async () => {
    await setPasskeyModeCookie({ phone: PHONE, username: USERNAME, mode: "authenticate" });

    expect(await readPasskeyModeCookie(PHONE, USERNAME)).toBe("authenticate");
  });

  it("normalizes the username (case, leading @) on both write and read", async () => {
    await setPasskeyModeCookie({ phone: PHONE, username: "@Louai", mode: "authenticate" });

    expect(await readPasskeyModeCookie(PHONE, "louai")).toBe("authenticate");
    expect(await readPasskeyModeCookie(PHONE, "LOUAI")).toBe("authenticate");
  });

  it("returns null if the phone doesn't match the stored cookie", async () => {
    await setPasskeyModeCookie({ phone: PHONE, username: USERNAME, mode: "authenticate" });

    expect(await readPasskeyModeCookie("+21699999999", USERNAME)).toBeNull();
  });

  it("returns null if the username doesn't match the stored cookie", async () => {
    await setPasskeyModeCookie({ phone: PHONE, username: USERNAME, mode: "authenticate" });

    expect(await readPasskeyModeCookie(PHONE, "someoneelse")).toBeNull();
  });

  it("returns null for malformed cookie content instead of throwing", async () => {
    store.set("mou3amla-passkey-mode", { value: "{not json" });

    expect(await readPasskeyModeCookie(PHONE, USERNAME)).toBeNull();
  });
});

describe("passkey challenge cookie", () => {
  beforeEach(() => {
    store.clear();
  });

  it("round-trips a challenge", async () => {
    await setChallengeCookie({ phone: PHONE, username: USERNAME, challenge: "chal-abc" });

    expect(await readChallengeCookie(PHONE, USERNAME)).toBe("chal-abc");
  });

  it("returns null if the phone/username doesn't match", async () => {
    await setChallengeCookie({ phone: PHONE, username: USERNAME, challenge: "chal-abc" });

    expect(await readChallengeCookie("+21699999999", USERNAME)).toBeNull();
    expect(await readChallengeCookie(PHONE, "someoneelse")).toBeNull();
  });

  it("returns null once cleared", async () => {
    await setChallengeCookie({ phone: PHONE, username: USERNAME, challenge: "chal-abc" });
    await clearChallengeCookie();

    expect(await readChallengeCookie(PHONE, USERNAME)).toBeNull();
  });

  it("returns null for malformed cookie content instead of throwing", async () => {
    store.set("mou3amla-passkey-challenge", { value: "{not json" });

    expect(await readChallengeCookie(PHONE, USERNAME)).toBeNull();
  });
});
