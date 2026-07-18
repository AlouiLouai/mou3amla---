import "server-only";

import { serverEnv } from "@/config/env.server";
import type { VerificationStatus } from "@/features/auth/types";
import { fetchWithTimeout } from "@/lib/fetch-with-timeout";
import { createAdminClient } from "@/lib/supabase/admin";

const DIDIT_TIMEOUT_MS = 15_000;

type DiditPayload = {
  data?: Record<string, unknown>;
  decision?: Record<string, unknown>;
  session_id?: string;
  status?: string;
  vendor_data?: string;
  timestamp?: number;
  created_at?: number;
};

type SyncedProfileRow = {
  id: string;
  verification_status: VerificationStatus;
  didit_latest_status: string | null;
  didit_session_id: string | null;
};

type ProfileStatusRow = SyncedProfileRow & { didit_status_event_at: string | null };

export type DiditSyncResult = {
  diditLatestStatus: string | null;
  matched: boolean;
  sessionId: string | null;
  updatedProfileId: string | null;
  verificationStatus: VerificationStatus | null;
};

function isUuid(value: string | null): value is string {
  return value !== null && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function extractString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function extractField(payload: DiditPayload, key: "session_id" | "status" | "vendor_data"): string | null {
  const topLevel = extractString(payload[key]);
  if (topLevel) return topLevel;

  const nestedData = extractString(payload.data?.[key]);
  if (nestedData) return nestedData;

  return extractString(payload.decision?.[key]);
}

/** Didit's webhook envelope carries `timestamp`/`created_at` as Unix seconds - used only to
 * detect a retried delivery arriving after a newer one already landed, never as the sole
 * freshness check (a direct status poll always wins regardless of timestamp). */
function extractEventTimestamp(payload: DiditPayload): number | null {
  const raw = payload.timestamp ?? payload.created_at;
  return typeof raw === "number" ? raw : null;
}

export function mapDiditStatus(status: string | null): VerificationStatus {
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

async function recordVerificationEvent({
  userId,
  previousStatus,
  nextStatus,
  source,
  sessionId,
  providerStatus,
}: {
  userId: string;
  previousStatus: VerificationStatus | null;
  nextStatus: VerificationStatus;
  source: string;
  sessionId: string | null;
  providerStatus: string;
}) {
  const admin = createAdminClient();
  await admin.from("verification_events").insert({
    user_id: userId,
    previous_status: previousStatus,
    next_status: nextStatus,
    source,
    provider_session_id: sessionId,
    provider_status: providerStatus,
  });
}

async function updateProfileStatus({
  profileId,
  sessionId,
  status,
  source,
  eventTimestamp,
}: {
  profileId?: string | null;
  sessionId?: string | null;
  status: string;
  source: string;
  eventTimestamp?: number | null;
}): Promise<SyncedProfileRow | null> {
  const admin = createAdminClient();
  const nextStatus = mapDiditStatus(status);

  const matchColumn = isUuid(profileId ?? null) ? "id" : sessionId ? "didit_session_id" : null;
  const matchValue = matchColumn === "id" ? profileId : sessionId;

  if (!matchColumn || !matchValue) {
    return null;
  }

  const { data: previous } = await admin
    .from("profiles")
    .select("id, verification_status, didit_latest_status, didit_session_id, didit_status_event_at")
    .eq(matchColumn, matchValue)
    .maybeSingle<ProfileStatusRow>();

  if (!previous) {
    return null;
  }

  // A retried/out-of-order webhook delivery carrying an older event than the
  // one already applied - a direct status poll (eventTimestamp null) always
  // bypasses this and applies, since it reflects Didit's current truth.
  if (eventTimestamp != null && previous.didit_status_event_at) {
    const isStale = eventTimestamp * 1000 < new Date(previous.didit_status_event_at).getTime();
    if (isStale) {
      return previous;
    }
  }

  const update: {
    verification_status: VerificationStatus;
    didit_latest_status: string;
    didit_session_id?: string;
    didit_status_event_at?: string;
  } = {
    verification_status: nextStatus,
    didit_latest_status: status,
  };

  if (sessionId) {
    update.didit_session_id = sessionId;
  }

  if (eventTimestamp != null) {
    update.didit_status_event_at = new Date(eventTimestamp * 1000).toISOString();
  }

  const { data, error } = await admin
    .from("profiles")
    .update(update)
    .eq(matchColumn, matchValue)
    .select("id, verification_status, didit_latest_status, didit_session_id")
    .maybeSingle<SyncedProfileRow>();

  if (error || !data) {
    return null;
  }

  if (previous.verification_status !== nextStatus) {
    await recordVerificationEvent({
      userId: data.id,
      previousStatus: previous.verification_status,
      nextStatus,
      source,
      sessionId: data.didit_session_id,
      providerStatus: status,
    });
  }

  return data;
}

export async function applyDiditPayload(payload: DiditPayload, source: string, preferredProfileId?: string | null): Promise<DiditSyncResult> {
  const sessionId = extractField(payload, "session_id");
  const status = extractField(payload, "status");
  const vendorData = extractField(payload, "vendor_data");
  const eventTimestamp = extractEventTimestamp(payload);

  if (!status) {
    return {
      diditLatestStatus: null,
      matched: false,
      sessionId,
      updatedProfileId: null,
      verificationStatus: null,
    };
  }

  const syncedProfile =
    (await updateProfileStatus({
      profileId: preferredProfileId,
      sessionId,
      status,
      source,
      eventTimestamp,
    })) ??
    (await updateProfileStatus({
      profileId: vendorData,
      sessionId,
      status,
      source,
      eventTimestamp,
    }));

  return {
    diditLatestStatus: status,
    matched: Boolean(syncedProfile),
    sessionId,
    updatedProfileId: syncedProfile?.id ?? null,
    verificationStatus: syncedProfile?.verification_status ?? mapDiditStatus(status),
  };
}

export async function syncDiditSessionStatus(sessionId: string, preferredProfileId?: string | null): Promise<DiditSyncResult | null> {
  if (!serverEnv.DIDIT_API_KEY || !sessionId) {
    return null;
  }

  let response: Response;
  try {
    response = await fetchWithTimeout(
      `https://verification.didit.me/v3/session/${sessionId}/decision/`,
      {
        method: "GET",
        headers: {
          "x-api-key": serverEnv.DIDIT_API_KEY,
        },
        cache: "no-store",
      },
      DIDIT_TIMEOUT_MS,
    );
  } catch {
    return null;
  }

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as DiditPayload;
  return applyDiditPayload(payload, "didit_status_poll", preferredProfileId);
}

/** Didit retries a webhook delivery up to twice on 5xx/404. Claims `event_id`
 * via the table's primary key so a retried delivery is a cheap no-op instead
 * of reprocessing - returns false when this event was already claimed. */
export async function claimWebhookEvent(eventId: string): Promise<boolean> {
  const admin = createAdminClient();
  const { error } = await admin.from("didit_webhook_events").insert({ event_id: eventId });

  if (error && (error as { code?: string }).code === "23505") {
    return false;
  }

  return true;
}
