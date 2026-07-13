import type { QrToken } from "@/features/payments/types";

export const QR_TOKEN_TTL_MS = 60_000;

/**
 * Opaque expiring proximity token encoded into the receive-screen QR code.
 *
 * This is intentionally NOT real cryptographic replay protection — it's a
 * base64 JSON blob with an expiry window, good enough for a client-only
 * prototype demo. A production version needs the token minted and signed
 * server-side (e.g. HMAC with a server-held key) so a scanner can verify it
 * hasn't been tampered with, not just that it hasn't expired.
 */
export function createQrToken(recipient: string): QrToken {
  const issuedAt = Date.now();
  return {
    recipient,
    nonce: Math.random().toString(36).slice(2, 12),
    issuedAt,
    expiresAt: issuedAt + QR_TOKEN_TTL_MS,
  };
}

export function encodeQrToken(token: QrToken): string {
  return btoa(JSON.stringify(token));
}

export function decodeQrToken(raw: string): QrToken | null {
  try {
    const parsed = JSON.parse(atob(raw));
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      typeof parsed.recipient === "string" &&
      typeof parsed.expiresAt === "number"
    ) {
      return parsed as QrToken;
    }
    return null;
  } catch {
    return null;
  }
}

export function isQrTokenExpired(token: QrToken): boolean {
  return Date.now() > token.expiresAt;
}
