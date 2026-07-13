import "server-only";

import type { RecipientPreview } from "@/features/payments/types";
import { maskRoutingValue, ROUTING_LABELS } from "@/features/wallets/lib/routing";
import { createAdminClient } from "@/lib/supabase/admin";

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

export async function resolveRecipientPreview(input: {
  recipientUserId?: string | null;
  username?: string | null;
}): Promise<RecipientPreview | null> {
  const admin = createAdminClient();
  const query = admin.from("profiles").select("id, username, display_name, verification_status");
  const { data: recipient, error: recipientError } = input.recipientUserId
    ? await query.eq("id", input.recipientUserId).maybeSingle<RecipientProfileRow>()
    : await query.eq("username", input.username ?? "").maybeSingle<RecipientProfileRow>();

  if (recipientError || !recipient) {
    return null;
  }

  const { data: primaryDestination } = await admin
    .from("linked_destinations")
    .select("name, routing_type, routing_value")
    .eq("user_id", recipient.id)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle<RecipientDestinationRow>();

  return {
    userId: recipient.id,
    username: recipient.username,
    displayName: recipient.display_name,
    verificationStatus: recipient.verification_status,
    primaryRouteLabel: primaryDestination
      ? `${primaryDestination.name} - ${ROUTING_LABELS[primaryDestination.routing_type]} - ${maskRoutingValue(primaryDestination.routing_value)}`
      : null,
  };
}
