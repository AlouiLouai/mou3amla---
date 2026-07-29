import { NextResponse } from "next/server";
import { NEARBY_GEO_MATCH_RADIUS_DEG } from "@/features/payments/constants";
import { generateNearbyCode } from "@/features/payments/lib/nearby-code";
import { withRouteErrorHandling } from "@/lib/api-handler";
import { checkRateLimit } from "@/lib/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type NearbyRow = {
  challenge_code: string;
};

function generateDecoy(excluded: Set<string>): string {
  let code = generateNearbyCode();

  while (excluded.has(code)) {
    code = generateNearbyCode();
  }

  return code;
}

function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export const GET = withRouteErrorHandling(async (request: Request) => {
  const url = new URL(request.url);
  const lat = Number(url.searchParams.get("lat"));
  const lng = Number(url.searchParams.get("lng"));
  const hasLocation = Number.isFinite(lat) && Number.isFinite(lng) && url.searchParams.has("lat") && url.searchParams.has("lng");

  const supabase = await createClient();
  const { data: authData, error: authError } = await supabase.auth.getClaims();

  if (authError || !authData?.claims?.sub) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const userId = authData.claims.sub;

  // Headroom above the ~20 legitimate calls/min from polling every NEARBY_OPTIONS_REFRESH_MS.
  const withinLimit = await checkRateLimit(`nearby-options:${userId}`, { max: 40, windowSeconds: 60 });
  if (!withinLimit) {
    return NextResponse.json({ message: "Too many requests. Please wait a moment and try again." }, { status: 429 });
  }

  const admin = createAdminClient();
  const nowIso = new Date().toISOString();

  function baseQuery() {
    return admin
      .from("nearby_handoffs")
      .select("challenge_code")
      .neq("owner_user_id", userId)
      .eq("status", "published")
      .gt("expires_at", nowIso)
      // Order by expires_at, not created_at - created_at only ever gets set
      // once per owner (upsert-on-conflict doesn't touch it on rotation).
      .order("expires_at", { ascending: false });
  }

  // Geolocation is a preference, not a gate: a NULL geo_lat/geo_lng (denied
  // permission) would make the range comparisons below silently exclude a
  // row under Postgres NULL semantics, so always fall back to the unfiltered
  // pool rather than ever returning zero candidates when a real one exists.
  let rows: NearbyRow[] | null = null;
  let error: { message: string } | null = null;

  // Overfetch to 24 so the shuffle below has a real pool to pick a fair 4
  // from - `limit 4` straight off expires_at would starve every host but
  // the top 4 freshest of visibility.
  if (hasLocation) {
    const geoQuery = baseQuery()
      .gte("geo_lat", lat - NEARBY_GEO_MATCH_RADIUS_DEG)
      .lte("geo_lat", lat + NEARBY_GEO_MATCH_RADIUS_DEG)
      .gte("geo_lng", lng - NEARBY_GEO_MATCH_RADIUS_DEG)
      .lte("geo_lng", lng + NEARBY_GEO_MATCH_RADIUS_DEG)
      .limit(24);
    const geoResult = await geoQuery;
    rows = geoResult.data as NearbyRow[] | null;
    error = geoResult.error;
  }

  if (!error && (!rows || rows.length === 0)) {
    const fallback = await baseQuery().limit(24);
    rows = fallback.data as NearbyRow[] | null;
    error = fallback.error;
  }

  if (error) {
    return NextResponse.json({ message: "We couldn't load nearby codes right now." }, { status: 500 });
  }

  // Shuffle before slicing to 4 - slicing straight off expires_at ordering
  // reintroduces the starvation this overfetch avoids.
  const realCodes = shuffle(Array.from(new Set(((rows ?? []) as NearbyRow[]).map((row) => row.challenge_code)))).slice(0, 4);
  const excluded = new Set(realCodes);
  const options = [...realCodes];

  while (options.length < 4) {
    const decoy = generateDecoy(excluded);
    excluded.add(decoy);
    options.push(decoy);
  }

  return NextResponse.json({
    options: shuffle(options),
    hasLiveMatch: realCodes.length > 0,
  });
});
