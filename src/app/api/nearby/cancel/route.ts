import { NextResponse } from "next/server";
import { withRouteErrorHandling } from "@/lib/api-handler";
import { checkRateLimit } from "@/lib/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/** Lets either side bail out of a stuck handshake. Owner cancel deletes the handoff outright; payer cancel only releases their claim back to "published". */
export const POST = withRouteErrorHandling(async () => {
  const supabase = await createClient();
  const { data: authData, error: authError } = await supabase.auth.getClaims();

  if (authError || !authData?.claims?.sub) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const userId = authData.claims.sub;

  const withinLimit = await checkRateLimit(`nearby-cancel:${userId}`, { max: 10, windowSeconds: 30 });
  if (!withinLimit) {
    return NextResponse.json({ message: "Too many attempts. Please wait a moment and try again." }, { status: 429 });
  }

  const admin = createAdminClient();

  await admin.from("nearby_handoffs").delete().eq("owner_user_id", userId);

  // The host's own amount (if any) is untouched by a payer releasing their
  // claim - it stays exactly as the host set it for the next guest who
  // claims this still-open code.
  await admin
    .from("nearby_handoffs")
    .update({ status: "published", payer_user_id: null, payer_accepted_at: null })
    .eq("payer_user_id", userId)
    .neq("status", "confirmed");

  return NextResponse.json({ ok: true });
});
