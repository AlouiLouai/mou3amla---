import { NextResponse } from "next/server";
import type { RecipientPreview } from "@/features/payments/types";
import { maskRoutingValue, ROUTING_LABELS } from "@/features/wallets/lib/routing";
import { withRouteErrorHandling } from "@/lib/api-handler";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type ProfileRow = {
  id: string;
  username: string;
  display_name: string;
  verification_status: RecipientPreview["verificationStatus"];
};

type DestinationRow = {
  user_id: string;
  name: string;
  routing_type: "wallet_tag" | "merchant_id" | "rib";
  routing_value: string;
  is_default: boolean;
};

export const GET = withRouteErrorHandling(async (request: Request) => {
  const url = new URL(request.url);
  const rawQuery = url.searchParams.get("q") ?? "";
  const query = rawQuery.replace(/^@+/, "").trim().toLowerCase();

  const supabase = await createClient();
  const { data: authData, error: authError } = await supabase.auth.getClaims();

  if (authError || !authData?.claims?.sub) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  if (query.length < 2) {
    return NextResponse.json({ users: [] satisfies RecipientPreview[] });
  }

  const admin = createAdminClient();
  const { data: profiles, error } = await admin
    .from("profiles")
    .select("id, username, display_name, verification_status")
    .ilike("username", `${query}%`)
    .neq("id", authData.claims.sub)
    .order("username", { ascending: true })
    .limit(8);

  if (error) {
    return NextResponse.json({ message: "We couldn't search users right now." }, { status: 500 });
  }

  const rows = (profiles ?? []) as ProfileRow[];
  const userIds = rows.map((row) => row.id);

  const destinationsByUser = new Map<string, DestinationRow>();
  if (userIds.length > 0) {
    const { data: destinations } = await admin
      .from("linked_destinations")
      .select("user_id, name, routing_type, routing_value, is_default")
      .in("user_id", userIds)
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: true });

    for (const destination of (destinations ?? []) as DestinationRow[]) {
      if (!destinationsByUser.has(destination.user_id)) {
        destinationsByUser.set(destination.user_id, destination);
      }
    }
  }

  const users: RecipientPreview[] = rows.map((row) => {
    const destination = destinationsByUser.get(row.id) ?? null;
    return {
      userId: row.id,
      username: row.username,
      displayName: row.display_name,
      verificationStatus: row.verification_status,
      primaryRouteLabel: destination
        ? `${destination.name} - ${ROUTING_LABELS[destination.routing_type]} - ${maskRoutingValue(destination.routing_value)}`
        : null,
    };
  });

  return NextResponse.json({ users });
});
