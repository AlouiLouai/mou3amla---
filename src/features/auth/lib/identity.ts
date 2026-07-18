import { z } from "zod";

const PHONE_DIGITS = /^\d{8}$/;
const USERNAME_PATTERN = /^[a-z0-9_]{3,24}$/;

export const landingInputSchema = z.object({
  phone: z
    .string()
    .trim()
    .transform((value) => value.replace(/\D/g, ""))
    .refine((value) => PHONE_DIGITS.test(value), {
      message: "Enter an 8-digit Tunisian phone number.",
    }),
  username: z
    .string()
    .trim()
    .transform((value) => value.replace(/^@+/, "").toLowerCase())
    .refine((value) => USERNAME_PATTERN.test(value), {
      message: "Username must be 3-24 characters using letters, numbers, or underscores.",
    }),
});

export function normalizePhoneForAuth(phoneDigits: string): string {
  return `+216${phoneDigits}`;
}

export function formatPhoneForDisplay(phoneDigitsOrE164: string): string {
  const digits = phoneDigitsOrE164.replace(/\D/g, "").slice(-8);
  if (digits.length !== 8) return phoneDigitsOrE164;
  return `${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5)}`;
}

export function formatUsernameHandle(username: string): string {
  return `@${username.replace(/^@+/, "").toLowerCase()}`;
}

export function buildDisplayName(username: string): string {
  return formatUsernameHandle(username);
}
