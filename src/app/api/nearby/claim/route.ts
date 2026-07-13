import { NextResponse } from "next/server";
import { z } from "zod";
import { env } from "@/config/env";
import { verifyQrToken, isQrTokenExpired } from "@/features/payments/lib/qr-token";
import { resolveRecipientPreview } from "@/features/payments/server/recipient-preview";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const claimSchema = z.object({
  code: z.string().regex(/^\d{3}$/),
});

type NearbyRow = {
  owner_user_id: string;
  signed_token: string;
  expires_at: string;
};

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
    .select("owner_user_id, signed_token, expires_at")
    .eq("challenge_code", parsed.data.code)
    .neq("owner_user_id", userId)
    .gt("expires_at", nowIso)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<NearbyRow>();

  if (error || !row) {
    return NextResponse.json({ message: "That nearby code is no longer available." }, { status: 404 });
  }

  const token = verifyQrToken(row.signed_token, env.QR_TOKEN_SECRET ?? env.SUPABASE_SERVICE_ROLE_KEY);
  if (!token || isQrTokenExpired(token)) {
    return NextResponse.json({ message: "That nearby code expired. Ask the recipient to refresh it." }, { status: 410 });
  }

  const recipient = await resolveRecipientPreview({
    recipientUserId: token.recipientUserId,
    username: token.recipient,
  });

  if (!recipient) {
    return NextResponse.json({ message: "Recipient not found." }, { status: 404 });
  }

  return NextResponse.json({ recipient });
}
