import "server-only";

import { cookies } from "next/headers";
import { serverEnv } from "@/config/env.server";

const MODE_COOKIE = "mou3amla-passkey-mode";
const CHALLENGE_COOKIE = "mou3amla-passkey-challenge";
const COOKIE_MAX_AGE_SECONDS = 5 * 60;

function normalizeUsername(username: string) {
  return username.replace(/^@+/, "").toLowerCase();
}

function cookieOptions(maxAge = COOKIE_MAX_AGE_SECONDS) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: serverEnv.NODE_ENV === "production",
    path: "/verify",
    maxAge,
  };
}

type ModePayload = { phone: string; username: string; mode: "register" | "authenticate" };

/** Set once by `startPhoneAuth` so `/verify` knows whether to render the
 * register or sign-in passkey UI - tied to the exact phone/username pair so
 * a tampered URL query string can't force a different mode. */
export async function setPasskeyModeCookie(payload: ModePayload) {
  const cookieStore = await cookies();
  cookieStore.set(MODE_COOKIE, JSON.stringify({ ...payload, username: normalizeUsername(payload.username) }), cookieOptions());
}

export async function readPasskeyModeCookie(phone: string, username: string): Promise<ModePayload["mode"] | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(MODE_COOKIE)?.value;

  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<ModePayload>;
    if (parsed.phone === phone && normalizeUsername(parsed.username ?? "") === normalizeUsername(username) && parsed.mode) {
      return parsed.mode;
    }
  } catch {
    return null;
  }

  return null;
}

type ChallengePayload = { phone: string; username: string; challenge: string };

/** Holds the WebAuthn challenge between "generate options" and "verify
 * response" - two separate requests either side of the browser's own
 * navigator.credentials ceremony. */
export async function setChallengeCookie(payload: ChallengePayload) {
  const cookieStore = await cookies();
  cookieStore.set(CHALLENGE_COOKIE, JSON.stringify({ ...payload, username: normalizeUsername(payload.username) }), cookieOptions());
}

export async function readChallengeCookie(phone: string, username: string): Promise<string | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(CHALLENGE_COOKIE)?.value;

  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<ChallengePayload>;
    if (parsed.phone === phone && normalizeUsername(parsed.username ?? "") === normalizeUsername(username) && parsed.challenge) {
      return parsed.challenge;
    }
  } catch {
    return null;
  }

  return null;
}

export async function clearChallengeCookie() {
  const cookieStore = await cookies();
  cookieStore.set(CHALLENGE_COOKIE, "", cookieOptions(0));
}
