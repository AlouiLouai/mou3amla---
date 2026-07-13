import "server-only";

import { cookies } from "next/headers";

const DEMO_OTP_COOKIE = "squad-demo-otp";
const DEMO_OTP_MAX_AGE_SECONDS = 5 * 60;

type DemoOtpPayload = {
  phone: string;
  username: string;
  otp: string;
};

function normalizeUsername(username: string) {
  return username.replace(/^@+/, "").toLowerCase();
}

export async function setDemoOtpCookie(payload: DemoOtpPayload) {
  const cookieStore = await cookies();
  cookieStore.set(DEMO_OTP_COOKIE, JSON.stringify({
    phone: payload.phone,
    username: normalizeUsername(payload.username),
    otp: payload.otp,
  }), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/verify",
    maxAge: DEMO_OTP_MAX_AGE_SECONDS,
  });
}

export async function readDemoOtpCookie(phone: string, username: string) {
  const cookieStore = await cookies();
  const raw = cookieStore.get(DEMO_OTP_COOKIE)?.value;

  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<DemoOtpPayload>;
    if (
      parsed.phone === phone &&
      normalizeUsername(parsed.username ?? "") === normalizeUsername(username) &&
      typeof parsed.otp === "string"
    ) {
      return parsed.otp;
    }
  } catch {
    return null;
  }

  return null;
}

export async function clearDemoOtpCookie() {
  const cookieStore = await cookies();
  cookieStore.set(DEMO_OTP_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/verify",
    maxAge: 0,
  });
}
