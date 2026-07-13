import { NextResponse } from "next/server";
import { env } from "@/config/env";
import { mintQrToken } from "@/features/payments/lib/qr-token";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type ProfileRow = {
  id: string;
  username: string;
};

type DestinationRow = {
  id: string;
};

function getQrTokenSecret(): string {
  return env.QR_TOKEN_SECRET ?? env.SUPABASE_SERVICE_ROLE_KEY;
}

export async function POST() {
  const supabase = await createClient();
  const { data: authData, error: authError } = await supabase.auth.getClaims();

  if (authError || !authData?.claims?.sub) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const userId = authData.claims.sub;

  const [{ data: profile, error: profileError }, { data: destination, error: destinationError }] = await Promise.all([
    admin.from("profiles").select("id, username").eq("id", userId).maybeSingle<ProfileRow>(),
    admin.from("linked_destinations").select("id").eq("user_id", userId).limit(1).maybeSingle<DestinationRow>(),
  ]);

  if (profileError || !profile) {
    return NextResponse.json({ message: "Profile not found." }, { status: 404 });
  }

  if (destinationError || !destination) {
    return NextResponse.json({ message: "Link a destination before requesting a QR code." }, { status: 403 });
  }

  const qrToken = mintQrToken({
    recipientUserId: profile.id,
    recipientUsername: profile.username,
    secret: getQrTokenSecret(),
  });

  return NextResponse.json(
    { qrToken },
    {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    },
  );
}
