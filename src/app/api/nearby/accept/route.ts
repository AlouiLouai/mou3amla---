import { NextResponse } from "next/server";
import { z } from "zod";
import { buildNearbyMatchPayload, loadNearbyMatchByCode, type NearbyHandoffRow } from "@/features/payments/server/nearby-match";
import { NEARBY_CODE_REGEX } from "@/features/payments/lib/nearby-code";
import { withRouteErrorHandling } from "@/lib/api-handler";
import { checkRateLimit } from "@/lib/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

const acceptSchema = z.object({
  code: z.string().regex(NEARBY_CODE_REGEX),
});

export const POST = withRouteErrorHandling(async (request: Request) => {
  const supabase = await createClient();
  const { data: authData, error: authError } = await supabase.auth.getClaims();

  if (authError || !authData?.claims?.sub) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const userId = authData.claims.sub;

  const withinLimit = await checkRateLimit(`nearby-accept:${userId}`, { max: 20, windowSeconds: 60 });
  if (!withinLimit) {
    return NextResponse.json({ message: "Too many attempts. Please wait a moment and try again." }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  const parsed = acceptSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: "Enter a valid nearby code." }, { status: 400 });
  }

  const lookup = await loadNearbyMatchByCode(parsed.data.code, userId);
  if ("error" in lookup) {
    const status = lookup.error === "forbidden" ? 403 : 404;
    return NextResponse.json({ message: "That nearby match is no longer available." }, { status });
  }

  if (lookup.row.status === "published") {
    return NextResponse.json({ message: "No one has matched this code yet." }, { status: 409 });
  }

  const admin = createAdminClient();

  // Read-decide-write here would race: two people tapping "Accept" at nearly
  // the same instant could both read before either write landed and neither
  // would ever flip status to "confirmed". `accept_nearby_handoff` does the
  // read-and-decide inside a single UPDATE so Postgres's row locking
  // serializes concurrent accepts correctly - see its migration for detail.
  const { data: updated, error: updateError } = await admin
    .rpc("accept_nearby_handoff", { p_id: lookup.row.id, p_role: lookup.role })
    .single<NearbyHandoffRow>();

  if (updateError || !updated) {
    logger.error("nearby accept RPC failed", updateError, { handoffId: lookup.row.id, role: lookup.role });
    return NextResponse.json({ message: "We couldn't confirm the match right now." }, { status: 500 });
  }

  return NextResponse.json({ match: await buildNearbyMatchPayload(updated, lookup.role) });
});
