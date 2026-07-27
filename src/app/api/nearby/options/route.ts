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

  // Polled every NEARBY_OPTIONS_REFRESH_MS (3s) while idle - max here needs
  // headroom above the ~20 legitimate calls/min that implies.
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
      // `expires_at` is freshly set on every rotation (publish upserts it
      // unconditionally); `created_at` is not - an owner's very first
      // publish for that row's unique owner_user_id sets it once, and a
      // later upsert-on-conflict only touches the columns actually in its
      // payload, which never included created_at. Ordering by created_at
      // silently sank long-session owners in the ranking behind anyone who
      // started publishing more recently, even though both had equally
      // fresh, currently-valid codes.
      .order("expires_at", { ascending: false });
  }

  // Geolocation is a *preference*, not a gate: coarse browser geolocation
  // (especially desktop/indoor) can easily be off by more than
  // NEARBY_GEO_MATCH_RADIUS_DEG even for two phones in the same room, and a
  // NULL geo_lat/geo_lng (owner declined the permission prompt) makes every
  // >=/<= comparison below evaluate to NULL - i.e. silently excluded - per
  // Postgres NULL semantics. Treating that as a hard filter meant a single
  // denied permission on either side made a otherwise-valid code invisible
  // forever, with no error surfaced anywhere. Try the geo-bounded query
  // first (it's a meaningful anti-abuse/precision signal when it works),
  // but always fall back to the unfiltered pool rather than ever returning
  // zero real candidates when a real one exists.
  let rows: NearbyRow[] | null = null;
  let error: { message: string } | null = null;

  // Fetch well beyond the 4 slots actually shown (see the shuffle below) -
  // with more than 4 codes live at once, `order by expires_at desc limit 4`
  // alone would deterministically return the *same* top-4 to every payer
  // polling at that moment, starving every other live host of visibility for
  // as long as 4 others stayed fresher. 24 is a cheap, bounded overfetch that
  // gives the shuffle a real pool to pick a fair 4 from.
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

  // Shuffled *before* slicing to 4 - see the overfetch comment above. Slicing
  // straight off the deterministic expires_at ordering is exactly what
  // reintroduces the starvation bug this replaced.
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
