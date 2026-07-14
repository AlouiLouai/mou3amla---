import { NextResponse } from "next/server";
import { z } from "zod";
import { buildNearbyMatchPayload, loadNearbyMatchByCode, type NearbyHandoffRow } from "@/features/payments/server/nearby-match";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const acceptSchema = z.object({
  code: z.string().regex(/^\d{3}$/),
});

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: authData, error: authError } = await supabase.auth.getClaims();

  if (authError || !authData?.claims?.sub) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = acceptSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: "Enter a valid 3-digit nearby code." }, { status: 400 });
  }

  const userId = authData.claims.sub;
  const lookup = await loadNearbyMatchByCode(parsed.data.code, userId);
  if ("error" in lookup) {
    const status = lookup.error === "forbidden" ? 403 : 404;
    return NextResponse.json({ message: "That nearby match is no longer available." }, { status });
  }

  if (lookup.row.status === "published") {
    return NextResponse.json({ message: "No one has matched this code yet." }, { status: 409 });
  }

  const admin = createAdminClient();
  const nowIso = new Date().toISOString();
  const column = lookup.role === "owner" ? "owner_accepted_at" : "payer_accepted_at";

  const willBothBeAccepted =
    lookup.role === "owner" ? !!lookup.row.payer_accepted_at : !!lookup.row.owner_accepted_at;

  const { data: updated, error: updateError } = await admin
    .from("nearby_handoffs")
    .update({
      [column]: nowIso,
      status: willBothBeAccepted ? "confirmed" : lookup.row.status,
    })
    .eq("id", lookup.row.id)
    .select("id, owner_user_id, payer_user_id, challenge_code, status, owner_accepted_at, payer_accepted_at, expires_at")
    .single<NearbyHandoffRow>();

  if (updateError || !updated) {
    return NextResponse.json({ message: "We couldn't confirm the match right now." }, { status: 500 });
  }

  return NextResponse.json({ match: await buildNearbyMatchPayload(updated, lookup.role) });
}
