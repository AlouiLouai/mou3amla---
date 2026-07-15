import { NextResponse } from "next/server";
import { buildNearbyMatchPayload, loadNearbyMatchByCode } from "@/features/payments/server/nearby-match";
import { withRouteErrorHandling } from "@/lib/api-handler";
import { createClient } from "@/lib/supabase/server";

export const GET = withRouteErrorHandling(async (request: Request) => {
  const url = new URL(request.url);
  const code = url.searchParams.get("code") ?? "";

  if (!/^\d{3}$/.test(code)) {
    return NextResponse.json({ message: "Provide a valid 3-digit nearby code." }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: authData, error: authError } = await supabase.auth.getClaims();

  if (authError || !authData?.claims?.sub) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const lookup = await loadNearbyMatchByCode(code, authData.claims.sub);
  if ("error" in lookup) {
    const status = lookup.error === "forbidden" ? 403 : 404;
    return NextResponse.json({ message: "That nearby match is no longer available." }, { status });
  }

  return NextResponse.json({ match: await buildNearbyMatchPayload(lookup.row, lookup.role) });
});
