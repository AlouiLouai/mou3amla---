import { NextResponse } from "next/server";
import { buildNearbyMatchPayload, loadNearbyMatchByCode } from "@/features/payments/server/nearby-match";
import { NEARBY_CODE_REGEX } from "@/features/payments/lib/nearby-code";
import { withRouteErrorHandling } from "@/lib/api-handler";
import { checkRateLimit } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";

export const GET = withRouteErrorHandling(async (request: Request) => {
  const url = new URL(request.url);
  const code = url.searchParams.get("code") ?? "";

  if (!NEARBY_CODE_REGEX.test(code)) {
    return NextResponse.json({ message: "Provide a valid nearby code." }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: authData, error: authError } = await supabase.auth.getClaims();

  if (authError || !authData?.claims?.sub) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const userId = authData.claims.sub;

  const withinLimit = await checkRateLimit(`nearby-status:${userId}`, { max: 30, windowSeconds: 60 });
  if (!withinLimit) {
    return NextResponse.json({ message: "Too many requests. Please wait a moment and try again." }, { status: 429 });
  }

  const lookup = await loadNearbyMatchByCode(code, userId);
  if ("error" in lookup) {
    const status = lookup.error === "forbidden" ? 403 : 404;
    return NextResponse.json({ message: "That nearby match is no longer available." }, { status });
  }

  return NextResponse.json({ match: await buildNearbyMatchPayload(lookup.row, lookup.role) });
});
