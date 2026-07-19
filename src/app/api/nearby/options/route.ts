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

  // Polled every NEARBY_OPTIONS_REFRESH_MS (4s) while idle - max here needs
  // headroom above the ~15 legitimate calls/min that implies.
  const withinLimit = await checkRateLimit(`nearby-options:${userId}`, { max: 40, windowSeconds: 60 });
  if (!withinLimit) {
    return NextResponse.json({ message: "Too many requests. Please wait a moment and try again." }, { status: 429 });
  }

  const admin = createAdminClient();
  const nowIso = new Date().toISOString();

  let query = admin
    .from("nearby_handoffs")
    .select("challenge_code")
    .neq("owner_user_id", userId)
    .eq("status", "published")
    .gt("expires_at", nowIso);

  // Bound "nearby" to plausible physical proximity when the payer shared a
  // coarse location - rows without a location (owner declined permission)
  // are correctly excluded by the range filter's NULL semantics. Without a
  // location from the payer, fall back to the unfiltered recent pool.
  if (hasLocation) {
    query = query
      .gte("geo_lat", lat - NEARBY_GEO_MATCH_RADIUS_DEG)
      .lte("geo_lat", lat + NEARBY_GEO_MATCH_RADIUS_DEG)
      .gte("geo_lng", lng - NEARBY_GEO_MATCH_RADIUS_DEG)
      .lte("geo_lng", lng + NEARBY_GEO_MATCH_RADIUS_DEG);
  }

  const { data: rows, error } = await query.order("created_at", { ascending: false }).limit(4);

  if (error) {
    return NextResponse.json({ message: "We couldn't load nearby codes right now." }, { status: 500 });
  }

  const realCodes = Array.from(new Set(((rows ?? []) as NearbyRow[]).map((row) => row.challenge_code))).slice(0, 4);
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
