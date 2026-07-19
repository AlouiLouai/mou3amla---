import { NextResponse } from "next/server";
import { z } from "zod";
import { NEARBY_GEO_MATCH_RADIUS_DEG, NEARBY_HANDSHAKE_TTL_MS } from "@/features/payments/constants";
import { roundCoord } from "@/features/payments/lib/geolocation";
import { NEARBY_CODE_REGEX } from "@/features/payments/lib/nearby-code";
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
  expires_at: string;
};

// Proposes a match on a published nearby code. This does not reveal the
// recipient yet - both the payer and the owner must separately call
// /api/nearby/accept before /api/nearby/status returns recipient details.
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

  let lookup = admin
    .from("nearby_handoffs")
    .select("id, expires_at")
    .eq("challenge_code", parsed.data.code)
    .eq("status", "published")
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
    return NextResponse.json({ message: "That nearby code is no longer available." }, { status: 404 });
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
    return NextResponse.json({ message: "Someone else just grabbed that code. Try another one." }, { status: 409 });
  }

  return NextResponse.json({
    handoff: {
      code: parsed.data.code,
      expiresAt: new Date(updated.expires_at).getTime(),
      status: "matched",
      ownerAccepted: false,
      payerAccepted: false,
    },
  });
});
