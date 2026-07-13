import { NextResponse } from "next/server";
import { env } from "@/config/env";
import { isQrTokenExpired, verifyQrToken } from "@/features/payments/lib/qr-token";
import { maskRoutingValue, ROUTING_LABELS } from "@/features/wallets/lib/routing";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type RecipientProfileRow = {
  id: string;
  username: string;
  display_name: string;
  verification_status: "unverified" | "pending" | "verified" | "rejected";
};

type RecipientDestinationRow = {
  name: string;
  routing_type: "wallet_tag" | "merchant_id" | "rib";
  routing_value: string;
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const rawToken = url.searchParams.get("token");
  const rawUsername = url.searchParams.get("username");

  const supabase = await createClient();
  const { data: authData, error: authError } = await supabase.auth.getClaims();
  if (authError || !authData?.claims?.sub) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  let username = rawUsername?.replace(/^@+/, "").trim().toLowerCase() ?? null;
  let recipientUserId: string | null = null;

  if (rawToken) {
    const token = verifyQrToken(rawToken, env.QR_TOKEN_SECRET ?? env.SUPABASE_SERVICE_ROLE_KEY);
    if (!token) {
      return NextResponse.json({ message: "Invalid QR token." }, { status: 400 });
    }

    if (isQrTokenExpired(token)) {
      return NextResponse.json({ message: "This QR code expired. Ask the recipient to refresh it." }, { status: 410 });
    }

    recipientUserId = token.recipientUserId;
    username = token.recipient.replace(/^@+/, "").trim().toLowerCase();
  }

  if (!username) {
    return NextResponse.json({ message: "Provide a token or username." }, { status: 400 });
  }

  const admin = createAdminClient();
  const recipientQuery = admin.from("profiles").select("id, username, display_name, verification_status");
  const { data: recipient, error: recipientError } = recipientUserId
    ? await recipientQuery.eq("id", recipientUserId).maybeSingle<RecipientProfileRow>()
    : await recipientQuery.eq("username", username).maybeSingle<RecipientProfileRow>();

  if (recipientError || !recipient) {
    return NextResponse.json({ message: "Recipient not found." }, { status: 404 });
  }

  const { data: primaryDestination } = await admin
    .from("linked_destinations")
    .select("name, routing_type, routing_value")
    .eq("user_id", recipient.id)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle<RecipientDestinationRow>();

  return NextResponse.json({
    recipient: {
      userId: recipient.id,
      username: recipient.username,
      displayName: recipient.display_name,
      verificationStatus: recipient.verification_status,
      primaryRouteLabel: primaryDestination
        ? `${primaryDestination.name} - ${ROUTING_LABELS[primaryDestination.routing_type]} - ${maskRoutingValue(primaryDestination.routing_value)}`
        : null,
    },
  });
}
