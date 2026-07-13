import "server-only";

import { env } from "@/config/env";
import type { VerificationStatus } from "@/features/auth/types";
import { createAdminClient } from "@/lib/supabase/admin";

type DiditPayload = {
  data?: Record<string, unknown>;
  decision?: Record<string, unknown>;
  session_id?: string;
  status?: string;
  vendor_data?: string;
};

type SyncedProfileRow = {
  id: string;
  verification_status: VerificationStatus;
  didit_latest_status: string | null;
  didit_session_id: string | null;
};

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

async function updateProfileStatus({
  profileId,
  sessionId,
  status,
}: {
  profileId?: string | null;
  sessionId?: string | null;
  status: string;
}): Promise<SyncedProfileRow | null> {
  const admin = createAdminClient();
  const update: {
    verification_status: VerificationStatus;
    didit_latest_status: string;
    didit_session_id?: string;
  } = {
    verification_status: mapDiditStatus(status),
    didit_latest_status: status,
  };

  if (sessionId) {
    update.didit_session_id = sessionId;
  }

  if (isUuid(profileId ?? null)) {
    const { data, error } = await admin
      .from("profiles")
      .update(update)
      .eq("id", profileId)
      .select("id, verification_status, didit_latest_status, didit_session_id")
      .maybeSingle<SyncedProfileRow>();

    if (!error && data) {
      return data;
    }
  }

  if (sessionId) {
    const { data, error } = await admin
      .from("profiles")
      .update(update)
      .eq("didit_session_id", sessionId)
      .select("id, verification_status, didit_latest_status, didit_session_id")
      .maybeSingle<SyncedProfileRow>();

    if (!error && data) {
      return data;
    }
  }

  return null;
}

export async function applyDiditPayload(payload: DiditPayload, preferredProfileId?: string | null): Promise<DiditSyncResult> {
  const sessionId = extractField(payload, "session_id");
  const status = extractField(payload, "status");
  const vendorData = extractField(payload, "vendor_data");

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
    })) ??
    (await updateProfileStatus({
      profileId: vendorData,
      sessionId,
      status,
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
  if (!env.DIDIT_API_KEY || !sessionId) {
    return null;
  }

  const response = await fetch(`https://verification.didit.me/v3/session/${sessionId}/decision/`, {
    method: "GET",
    headers: {
      "x-api-key": env.DIDIT_API_KEY,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as DiditPayload;
  return applyDiditPayload(payload, preferredProfileId);
}
