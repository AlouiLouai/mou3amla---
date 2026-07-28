import { NextResponse } from "next/server";
import { z } from "zod";
import { NEARBY_GEO_MATCH_RADIUS_DEG, NEARBY_HANDSHAKE_TTL_MS } from "@/features/payments/constants";
import { roundCoord } from "@/features/payments/lib/geolocation";
import { NEARBY_CODE_REGEX } from "@/features/payments/lib/nearby-code";
import { resolveUsername } from "@/features/payments/server/nearby-match";
import { withRouteErrorHandling } from "@/lib/api-handler";
import { checkRateLimit } from "@/lib/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const claimSchema = z.object({
  code: z.string().regex(NEARBY_CODE_REGEX),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
});

type NearbyRow = {
  id: string;
  owner_user_id: string;
  status: "published" | "matched" | "confirmed";
  expires_at: string;
  amount: number | null;
};

// Proposes a match on a published nearby code. This reveals the owner's
// username only (so the payer can visually confirm they matched the right
// physical person before accepting) - full recipient details (routing,
// verification status) still wait until both sides separately call
// /api/nearby/accept and status becomes "confirmed".
export const POST = withRouteErrorHandling(async (request: Request) => {
  const supabase = await createClient();
  const { data: authData, error: authError } = await supabase.auth.getClaims();

  if (authError || !authData?.claims?.sub) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  // The challenge code space is only 100,000 wide (see NEARBY_CODE_DIGITS) -
  // without a tight per-user cap, a script could still exhaust a meaningful
  // slice of it inside the code's own short TTL. This caps brute-forcing a
  // stranger's code to a handful of tries a minute, not a scan of the whole
  // keyspace.
  const withinLimit = await checkRateLimit(`nearby-claim:${authData.claims.sub}`, { max: 8, windowSeconds: 30 });
  if (!withinLimit) {
    return NextResponse.json({ message: "Too many attempts. Please wait a moment and try again." }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  const parsed = claimSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: "Enter a valid nearby code." }, { status: 400 });
  }

  const admin = createAdminClient();
  const userId = authData.claims.sub;
  const nowIso = new Date().toISOString();
  const hasLocation = parsed.data.lat !== undefined && parsed.data.lng !== undefined;
  const lat = hasLocation ? roundCoord(parsed.data.lat!) : null;
  const lng = hasLocation ? roundCoord(parsed.data.lng!) : null;

  // Deliberately no `.eq("status", "published")` here - that used to live in
  // this same lookup, which meant a code that's legitimately busy (someone
  // else mid-handshake with its owner) returned the exact same "not found"
  // 404 as a code that's genuinely gone (expired/wrong code/out of range).
  // Checking status separately below lets the two cases give the payer a
  // different, honest message instead of an identical dead end.
  let lookup = admin
    .from("nearby_handoffs")
    .select("id, owner_user_id, status, expires_at, amount")
    .eq("challenge_code", parsed.data.code)
    .neq("owner_user_id", userId)
    .gt("expires_at", nowIso);

  // If the payer shared a coarse location, don't let a claim through for a
  // code whose owner is (or claims to be) somewhere else entirely - a code
  // published without a location can't be verified either way, so it's
  // excluded here rather than trusted blindly.
  if (hasLocation) {
    lookup = lookup
      .gte("geo_lat", lat! - NEARBY_GEO_MATCH_RADIUS_DEG)
      .lte("geo_lat", lat! + NEARBY_GEO_MATCH_RADIUS_DEG)
      .gte("geo_lng", lng! - NEARBY_GEO_MATCH_RADIUS_DEG)
      .lte("geo_lng", lng! + NEARBY_GEO_MATCH_RADIUS_DEG);
  }

  const { data: row, error } = await lookup.order("created_at", { ascending: false }).limit(1).maybeSingle<NearbyRow>();

  if (error || !row) {
    return NextResponse.json({ message: "That nearby code is no longer available.", reason: "not_found" }, { status: 404 });
  }

  const busyResponse = NextResponse.json(
    { message: "That person is already finishing another nearby payment. Please wait a few seconds and try again.", reason: "busy" },
    { status: 409 },
  );

  if (row.status !== "published") {
    return busyResponse;
  }

  const handshakeExpiresAt = new Date(Date.now() + NEARBY_HANDSHAKE_TTL_MS).toISOString();

  const { data: updated, error: updateError } = await admin
    .from("nearby_handoffs")
    .update({ status: "matched", payer_user_id: userId, expires_at: handshakeExpiresAt })
    .eq("id", row.id)
    .eq("status", "published")
    .select("expires_at")
    .maybeSingle<{ expires_at: string }>();

  if (updateError || !updated) {
    // Lost the atomic race between the status check above and this write -
    // someone else's claim landed first. Same "busy" framing, since from the
    // payer's perspective it's the identical situation.
    return busyResponse;
  }

  const counterpartUsername = await resolveUsername(row.owner_user_id);

  return NextResponse.json({
    handoff: {
      code: parsed.data.code,
      expiresAt: new Date(updated.expires_at).getTime(),
      status: "matched",
      ownerAccepted: false,
      payerAccepted: false,
      amount: row.amount,
      counterpartUsername,
    },
  });
});
