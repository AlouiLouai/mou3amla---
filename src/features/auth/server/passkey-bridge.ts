import "server-only";

import { cookies } from "next/headers";
import { serverEnv } from "@/config/env.server";

const BRIDGE_COOKIE = "mou3amla-passkey-bridge";
const BRIDGE_MAX_AGE_SECONDS = 5 * 60;

type PasskeyBridgePayload = {
  phone: string;
  username: string;
  mode: "register" | "authenticate";
  tokenHash?: string;
};

function normalizeUsername(username: string) {
  return username.replace(/^@+/, "").toLowerCase();
}

export async function setPasskeyBridgeCookie(payload: PasskeyBridgePayload) {
  const cookieStore = await cookies();
  cookieStore.set(BRIDGE_COOKIE, JSON.stringify({
    ...payload,
    username: normalizeUsername(payload.username),
  }), {
    httpOnly: true,
    sameSite: "lax",
    secure: serverEnv.NODE_ENV === "production",
    path: "/verify",
    maxAge: BRIDGE_MAX_AGE_SECONDS,
  });
}

export async function readPasskeyBridgeCookie(phone: string, username: string) {
  const cookieStore = await cookies();
  const raw = cookieStore.get(BRIDGE_COOKIE)?.value;

  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<PasskeyBridgePayload>;
    if (parsed.phone === phone && normalizeUsername(parsed.username ?? "") === normalizeUsername(username) && parsed.mode) {
      return parsed as PasskeyBridgePayload;
    }
  } catch {
    return null;
  }

  return null;
}

export async function clearPasskeyBridgeCookie() {
  const cookieStore = await cookies();
  cookieStore.set(BRIDGE_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: serverEnv.NODE_ENV === "production",
    path: "/verify",
    maxAge: 0,
  });
}
