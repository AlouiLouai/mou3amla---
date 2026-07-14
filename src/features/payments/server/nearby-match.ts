import "server-only";

import { resolveRecipientPreview } from "@/features/payments/server/recipient-preview";
import type { NearbyMatchStatus, RecipientPreview } from "@/features/payments/types";
import { createAdminClient } from "@/lib/supabase/admin";

export type NearbyHandoffRow = {
  id: string;
  owner_user_id: string;
  payer_user_id: string | null;
  challenge_code: string;
  status: NearbyMatchStatus;
  owner_accepted_at: string | null;
  payer_accepted_at: string | null;
  expires_at: string;
};

export interface NearbyMatchLookup {
  row: NearbyHandoffRow;
  role: "owner" | "payer";
}

export async function loadNearbyMatchByCode(code: string, userId: string): Promise<NearbyMatchLookup | { error: "not_found" | "forbidden" }> {
  const admin = createAdminClient();
  const nowIso = new Date().toISOString();

  const { data: row, error } = await admin
    .from("nearby_handoffs")
    .select("id, owner_user_id, payer_user_id, challenge_code, status, owner_accepted_at, payer_accepted_at, expires_at")
    .eq("challenge_code", code)
    .gt("expires_at", nowIso)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<NearbyHandoffRow>();

  if (error || !row) {
    return { error: "not_found" };
  }

  if (row.owner_user_id === userId) {
    return { row, role: "owner" };
  }

  if (row.payer_user_id === userId) {
    return { row, role: "payer" };
  }

  return { error: "forbidden" };
}

export async function buildNearbyMatchPayload(row: NearbyHandoffRow, role: "owner" | "payer") {
  let recipient: RecipientPreview | null = null;

  if (row.status === "confirmed") {
    recipient = await resolveRecipientPreview({ recipientUserId: row.owner_user_id });
  }

  return {
    code: row.challenge_code,
    status: row.status,
    ownerAccepted: !!row.owner_accepted_at,
    payerAccepted: !!row.payer_accepted_at,
    isOwner: role === "owner",
    expiresAt: new Date(row.expires_at).getTime(),
    recipient: recipient ?? undefined,
  };
}
