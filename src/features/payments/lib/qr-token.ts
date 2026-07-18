import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { serverEnv } from "@/config/env.server";
import { QR_TOKEN_TTL_MS } from "@/features/payments/constants";
import type { QrToken } from "@/features/payments/types";
const QR_TOKEN_VERSION = "sqd1";

/** Falls back to the service-role key only because no dedicated secret was configured for this MVP - set QR_TOKEN_SECRET in production so QR-token signing isn't coupled to the DB admin credential. */
export function getQrTokenSecret(): string {
  return serverEnv.QR_TOKEN_SECRET ?? serverEnv.SUPABASE_SERVICE_ROLE_KEY;
}

type SignedQrTokenPayload = {
  sub: string;
  usr: string;
  nonce: string;
  iat: number;
  exp: number;
};

function encodeBase64Url(value: string | Buffer): string {
  return Buffer.from(value)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function decodeBase64Url(value: string): string {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  return Buffer.from(padded, "base64").toString("utf8");
}

function buildSignature(input: string, secret: string): string {
  return encodeBase64Url(createHmac("sha256", secret).update(input).digest());
}

function safeEqual(expected: string, provided: string): boolean {
  const expectedBuffer = Buffer.from(expected);
  const providedBuffer = Buffer.from(provided);

  if (expectedBuffer.length !== providedBuffer.length) {
    return false;
  }

  return timingSafeEqual(expectedBuffer, providedBuffer);
}

function parsePayload(value: string): SignedQrTokenPayload | null {
  try {
    const parsed = JSON.parse(decodeBase64Url(value)) as Partial<SignedQrTokenPayload>;

    if (
      typeof parsed.sub !== "string" ||
      typeof parsed.usr !== "string" ||
      typeof parsed.nonce !== "string" ||
      typeof parsed.iat !== "number" ||
      typeof parsed.exp !== "number"
    ) {
      return null;
    }

    return {
      sub: parsed.sub,
      usr: parsed.usr,
      nonce: parsed.nonce,
      iat: parsed.iat,
      exp: parsed.exp,
    };
  } catch {
    return null;
  }
}

export function mintQrToken(input: {
  recipientUserId: string;
  recipientUsername: string;
  secret: string;
}): QrToken {
  const issuedAt = Date.now();
  const payload: SignedQrTokenPayload = {
    sub: input.recipientUserId,
    usr: input.recipientUsername,
    nonce: randomUUID().replace(/-/g, "").slice(0, 16),
    iat: issuedAt,
    exp: issuedAt + QR_TOKEN_TTL_MS,
  };

  const encodedPayload = encodeBase64Url(JSON.stringify(payload));
  const signingInput = `${QR_TOKEN_VERSION}.${encodedPayload}`;
  const signature = buildSignature(signingInput, input.secret);
  const token = `${signingInput}.${signature}`;

  return {
    token,
    recipientUserId: payload.sub,
    recipient: payload.usr,
    nonce: payload.nonce,
    issuedAt: payload.iat,
    expiresAt: payload.exp,
    signatureVersion: QR_TOKEN_VERSION,
  };
}

export function verifyQrToken(raw: string, secret: string): QrToken | null {
  const [version, encodedPayload, signature] = raw.split(".");
  if (!version || !encodedPayload || !signature || version !== QR_TOKEN_VERSION) {
    return null;
  }

  const signingInput = `${version}.${encodedPayload}`;
  const expectedSignature = buildSignature(signingInput, secret);
  if (!safeEqual(expectedSignature, signature)) {
    return null;
  }

  const payload = parsePayload(encodedPayload);
  if (!payload) {
    return null;
  }

  return {
    token: raw,
    recipientUserId: payload.sub,
    recipient: payload.usr,
    nonce: payload.nonce,
    issuedAt: payload.iat,
    expiresAt: payload.exp,
    signatureVersion: version,
  };
}

export function isQrTokenExpired(token: Pick<QrToken, "expiresAt">): boolean {
  return Date.now() > token.expiresAt;
}
