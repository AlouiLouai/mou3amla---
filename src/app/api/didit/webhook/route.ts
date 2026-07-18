import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { serverEnv } from "@/config/env.server";
import { applyDiditPayload } from "@/features/onboarding/server/didit";

type DiditWebhookPayload = {
  event_id?: string;
  data?: {
    session_id?: string;
    status?: string;
    vendor_data?: string;
    webhook_type?: string;
  };
  session_id?: string;
  status?: string;
  vendor_data?: string;
  webhook_type?: string;
};

/** Didit's documented X-Signature-V2 scheme: sorted keys, compact separators, unescaped unicode. */
function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortKeys);
  }

  if (value && typeof value === "object") {
    return Object.keys(value as Record<string, unknown>)
      .sort()
      .reduce<Record<string, unknown>>((result, key) => {
        result[key] = sortKeys((value as Record<string, unknown>)[key]);
        return result;
      }, {});
  }

  return value;
}

function canonicalize(value: unknown): string {
  return JSON.stringify(sortKeys(value));
}

function safeEqual(expected: string, provided: string | null): boolean {
  if (!provided) return false;
  const expectedBuffer = Buffer.from(expected);
  const providedBuffer = Buffer.from(provided);
  if (expectedBuffer.length !== providedBuffer.length) return false;
  return timingSafeEqual(expectedBuffer, providedBuffer);
}

function extractField(payload: DiditWebhookPayload, key: "session_id" | "status" | "vendor_data" | "webhook_type") {
  if (typeof payload[key] === "string") return payload[key] as string;
  if (payload.data && typeof payload.data[key] === "string") return payload.data[key] as string;
  return null;
}

export async function POST(request: Request) {
  if (!serverEnv.DIDIT_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Didit webhook secret missing" }, { status: 500 });
  }

  const timestamp = request.headers.get("x-timestamp");
  if (!timestamp || Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) {
    return NextResponse.json({ error: "Stale webhook timestamp" }, { status: 400 });
  }

  const rawBody = await request.text();
  let payload: DiditWebhookPayload;

  try {
    payload = JSON.parse(rawBody) as DiditWebhookPayload;
  } catch {
    return NextResponse.json({ error: "Invalid Didit JSON payload" }, { status: 400 });
  }

  const expectedSignature = createHmac("sha256", serverEnv.DIDIT_WEBHOOK_SECRET).update(canonicalize(payload)).digest("hex");
  const verified = safeEqual(expectedSignature, request.headers.get("x-signature-v2"));

  const status = extractField(payload, "status");

  if (!verified || !status) {
    return NextResponse.json({ error: "Invalid webhook signature or payload" }, { status: 401 });
  }

  const result = await applyDiditPayload(payload, "didit_webhook");

  if (!result.matched) {
    const sessionId = extractField(payload, "session_id");
    const webhookType = extractField(payload, "webhook_type") ?? "status.updated";
    console.warn("[didit:webhook] verified payload did not match any profile", {
      sessionId,
      status,
      webhookType,
    });
  }

  return NextResponse.json({ ok: true, matched: result.matched });
}
