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
  amount: number | null;
};

export interface NearbyMatchLookup {
  row: NearbyHandoffRow;
  role: "owner" | "payer";
}

// Username only - not the full RecipientPreview (no routing/verification
// detail). Shared by buildNearbyMatchPayload and /api/nearby/claim's own
// response so both call sites resolve "the other side's public handle" the
// same lightweight way.
export async function resolveUsername(userId: string): Promise<string | null> {
  const admin = createAdminClient();
  const { data } = await admin.from("profiles").select("username").eq("id", userId).maybeSingle<{ username: string }>();
  return data?.username ?? null;
}

export async function loadNearbyMatchByCode(code: string, userId: string): Promise<NearbyMatchLookup | { error: "not_found" | "forbidden" }> {
  const admin = createAdminClient();
  const nowIso = new Date().toISOString();

  const { data: row, error } = await admin
    .from("nearby_handoffs")
    .select("id, owner_user_id, payer_user_id, challenge_code, status, owner_accepted_at, payer_accepted_at, expires_at, amount")
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

  // The counterpart's username alone surfaces as soon as a match exists
  // (published -> matched), well before `recipient` above - so both sides
  // can visually confirm they matched the physical person they intended
  // (not just trust that the numeric code happened to line up) before ever
  // tapping Accept. Deliberately narrower than `recipient`: no routing value,
  // no verification status, just the public @handle this whole product is
  // built around (already searchable via /api/users/search) - a much smaller
  // reveal than full identity, and shown a stage earlier on purpose.
  const counterpartUserId = role === "owner" ? row.payer_user_id : row.owner_user_id;
  const counterpartUsername = counterpartUserId ? await resolveUsername(counterpartUserId) : null;

  return {
    code: row.challenge_code,
    status: row.status,
    amount: row.amount,
    ownerAccepted: !!row.owner_accepted_at,
    payerAccepted: !!row.payer_accepted_at,
    isOwner: role === "owner",
    expiresAt: new Date(row.expires_at).getTime(),
    recipient: recipient ?? undefined,
    counterpartUsername,
  };
}
