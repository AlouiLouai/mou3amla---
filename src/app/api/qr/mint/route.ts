import { NextResponse } from "next/server";
import { getQrTokenSecret, mintQrToken } from "@/features/payments/lib/qr-token";
import { withRouteErrorHandling } from "@/lib/api-handler";
import { checkRateLimit } from "@/lib/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type ProfileRow = {
  id: string;
  username: string;
};

type DestinationRow = {
  id: string;
};

export const POST = withRouteErrorHandling(async () => {
  const supabase = await createClient();
  const { data: authData, error: authError } = await supabase.auth.getClaims();

  if (authError || !authData?.claims?.sub) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const userId = authData.claims.sub;

  // The receive screen's own rotation calls this once per QR_TOKEN_TTL_MS
  // (60s); this cap is a generous multiple of that so normal use and the odd
  // manual retry are unaffected while a scripted hammering loop is not.
  const withinLimit = await checkRateLimit(`qr-mint:${userId}`, { max: 15, windowSeconds: 60 });
  if (!withinLimit) {
    return NextResponse.json({ message: "Too many requests. Please wait a moment and try again." }, { status: 429 });
  }

  const admin = createAdminClient();

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
});
