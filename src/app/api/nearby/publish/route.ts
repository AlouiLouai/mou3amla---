import { NextResponse } from "next/server";
import { env } from "@/config/env";
import { QR_TOKEN_TTL_MS } from "@/features/payments/constants";
import { mintQrToken } from "@/features/payments/lib/qr-token";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type ProfileRow = {
  id: string;
  username: string;
};

function generateChallengeCode(): string {
  return Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, "0");
}

export async function POST() {
  const supabase = await createClient();
  const { data: authData, error: authError } = await supabase.auth.getClaims();

  if (authError || !authData?.claims?.sub) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const userId = authData.claims.sub;
  const nowIso = new Date().toISOString();

  const [{ data: profile, error: profileError }, { data: destination, error: destinationError }] = await Promise.all([
    admin.from("profiles").select("id, username").eq("id", userId).maybeSingle<ProfileRow>(),
    admin.from("linked_destinations").select("id").eq("user_id", userId).limit(1).maybeSingle(),
  ]);

  if (profileError || !profile) {
    return NextResponse.json({ message: "Profile not found." }, { status: 404 });
  }

  if (destinationError || !destination) {
    return NextResponse.json({ message: "Link a destination before publishing a nearby code." }, { status: 403 });
  }

  await admin.from("nearby_handoffs").delete().eq("owner_user_id", userId);
  await admin.from("nearby_handoffs").delete().lt("expires_at", nowIso);

  let challengeCode = generateChallengeCode();
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const { data: collision } = await admin
      .from("nearby_handoffs")
      .select("id")
      .eq("challenge_code", challengeCode)
      .gt("expires_at", nowIso)
      .limit(1)
      .maybeSingle();

    if (!collision) {
      break;
    }

    challengeCode = generateChallengeCode();
  }

  const qrToken = mintQrToken({
    recipientUserId: profile.id,
    recipientUsername: profile.username,
    secret: env.QR_TOKEN_SECRET ?? env.SUPABASE_SERVICE_ROLE_KEY,
  });

  const { error: insertError } = await admin.from("nearby_handoffs").insert({
    owner_user_id: profile.id,
    signed_token: qrToken.token,
    challenge_code: challengeCode,
    expires_at: new Date(Date.now() + QR_TOKEN_TTL_MS).toISOString(),
  });

  if (insertError) {
    return NextResponse.json({ message: "We couldn't publish a nearby code right now." }, { status: 500 });
  }

  return NextResponse.json({
    handoff: {
      code: challengeCode,
      expiresAt: Date.now() + QR_TOKEN_TTL_MS,
    },
  });
}
