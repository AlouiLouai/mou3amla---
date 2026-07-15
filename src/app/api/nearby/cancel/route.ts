import { NextResponse } from "next/server";
import { withRouteErrorHandling } from "@/lib/api-handler";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

// Lets either side bail out of a stuck handshake instead of waiting out the TTL.
// Owner cancel deletes their own handoff outright (frees the code immediately).
// Payer cancel only releases their claim back to "published" so the code stays
// live for the owner and other nearby payers - it does not touch someone else's row.
export const POST = withRouteErrorHandling(async () => {
  const supabase = await createClient();
  const { data: authData, error: authError } = await supabase.auth.getClaims();

  if (authError || !authData?.claims?.sub) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const userId = authData.claims.sub;

  await admin.from("nearby_handoffs").delete().eq("owner_user_id", userId);

  await admin
    .from("nearby_handoffs")
    .update({ status: "published", payer_user_id: null, payer_accepted_at: null })
    .eq("payer_user_id", userId)
    .neq("status", "confirmed");

  return NextResponse.json({ ok: true });
});
