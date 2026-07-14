import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const claimSchema = z.object({
  code: z.string().regex(/^\d{3}$/),
});

type NearbyRow = {
  id: string;
  expires_at: string;
};

// Proposes a match on a published nearby code. This does not reveal the
// recipient yet - both the payer and the owner must separately call
// /api/nearby/accept before /api/nearby/status returns recipient details.
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: authData, error: authError } = await supabase.auth.getClaims();

  if (authError || !authData?.claims?.sub) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = claimSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: "Enter a valid 3-digit nearby code." }, { status: 400 });
  }

  const admin = createAdminClient();
  const userId = authData.claims.sub;
  const nowIso = new Date().toISOString();

  const { data: row, error } = await admin
    .from("nearby_handoffs")
    .select("id, expires_at")
    .eq("challenge_code", parsed.data.code)
    .eq("status", "published")
    .neq("owner_user_id", userId)
    .gt("expires_at", nowIso)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<NearbyRow>();

  if (error || !row) {
    return NextResponse.json({ message: "That nearby code is no longer available." }, { status: 404 });
  }

  const { data: updated, error: updateError } = await admin
    .from("nearby_handoffs")
    .update({ status: "matched", payer_user_id: userId })
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
}
