import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { env } from "@/config/env";
import type { VerificationStatus } from "@/features/auth/types";
import { createAdminClient } from "@/lib/supabase/admin";

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

function shortenFloats(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(shortenFloats);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, entry]) => [key, shortenFloats(entry)]),
    );
  }

  if (typeof value === "number" && !Number.isInteger(value) && value % 1 === 0) {
    return Math.trunc(value);
  }

  return value;
}

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

function stableStringify(value: unknown): string {
  return JSON.stringify(sortKeys(shortenFloats(value)));
}

function safeEqual(expected: string, provided: string | null): boolean {
  if (!provided) return false;
  const expectedBuffer = Buffer.from(expected);
  const providedBuffer = Buffer.from(provided);
  if (expectedBuffer.length !== providedBuffer.length) return false;
  return timingSafeEqual(expectedBuffer, providedBuffer);
}

function mapDiditStatus(status: string | null): VerificationStatus {
  switch (status) {
    case "Approved":
      return "verified";
    case "Declined":
    case "Expired":
    case "Abandoned":
    case "Kyc Expired":
      return "rejected";
    case "Not Started":
    case "In Progress":
    case "Awaiting User":
    case "Resubmitted":
    case "In Review":
    default:
      return "pending";
  }
}

function extractField(payload: DiditWebhookPayload, key: "session_id" | "status" | "vendor_data" | "webhook_type") {
  if (typeof payload[key] === "string") return payload[key] as string;
  if (payload.data && typeof payload.data[key] === "string") return payload.data[key] as string;
  return null;
}

export async function POST(request: Request) {
  if (!env.DIDIT_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Didit webhook secret missing" }, { status: 500 });
  }

  const timestamp = request.headers.get("x-timestamp");
  if (!timestamp || Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) {
    return NextResponse.json({ error: "Stale webhook timestamp" }, { status: 400 });
  }

  const rawBody = await request.text();
  const payload = JSON.parse(rawBody) as DiditWebhookPayload;
  const sessionId = extractField(payload, "session_id");
  const status = extractField(payload, "status");
  const vendorData = extractField(payload, "vendor_data");
  const webhookType = extractField(payload, "webhook_type") ?? "status.updated";

  const v2Expected = createHmac("sha256", env.DIDIT_WEBHOOK_SECRET)
    .update(stableStringify(JSON.parse(rawBody)))
    .digest("hex");
  const rawExpected = createHmac("sha256", env.DIDIT_WEBHOOK_SECRET).update(rawBody).digest("hex");
  const simpleExpected =
    sessionId && status
      ? createHmac("sha256", env.DIDIT_WEBHOOK_SECRET)
          .update(`${timestamp}:${sessionId}:${status}:${webhookType}`)
          .digest("hex")
      : null;

  const verified =
    safeEqual(v2Expected, request.headers.get("x-signature-v2")) ||
    safeEqual(rawExpected, request.headers.get("x-signature")) ||
    (simpleExpected ? safeEqual(simpleExpected, request.headers.get("x-signature-simple")) : false);

  if (!verified || !vendorData || !status) {
    return NextResponse.json({ error: "Invalid webhook signature or payload" }, { status: 401 });
  }

  const admin = createAdminClient();
  await admin
    .from("profiles")
    .update({
      verification_status: mapDiditStatus(status),
      didit_latest_status: status,
      didit_session_id: sessionId,
    })
    .eq("id", vendorData);

  return NextResponse.json({ ok: true });
}
