import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { ActivityItem } from "@/features/activity/types";
import type { AppProfileRecord, AuthenticatedAppUser, VerificationStatus } from "@/features/auth/types";
import type { NotificationItem } from "@/features/notifications/types";
import type { LinkedWallet } from "@/features/wallets/types";

type ProfileRow = {
  id: string;
  phone: string;
  username: string;
  display_name: string;
  verification_status: VerificationStatus;
  kyc_provider_status: string | null;
  created_at: string;
  updated_at: string;
};

type LinkedDestinationRow = {
  id: string;
  provider_id: string;
  name: string;
  network: string;
  color: string;
  initials: string;
  routing_type: LinkedWallet["routingType"];
  routing_value: string;
  is_default: boolean;
  created_at: string;
};

type TransactionMetadata = {
  sender_display_name?: string;
  sender_username?: string;
  sender_wallet_name?: string;
  recipient_wallet_name?: string;
};

type TransactionRow = {
  id: string;
  ref_id: string;
  sender_user_id: string;
  recipient_user_id: string | null;
  amount: number | string;
  recipient_username: string;
  recipient_display_name: string | null;
  status: ActivityItem["status"];
  metadata: TransactionMetadata | null;
  created_at: string;
};

type NotificationRow = {
  id: string;
  type: NotificationItem["type"];
  title: string;
  body: string;
  unread: boolean;
  created_at: string;
};

type CounterpartyProfileRow = {
  id: string;
  username: string;
  display_name: string;
};

function toAppProfile(profile: ProfileRow): AppProfileRecord {
  return {
    id: profile.id,
    phone: profile.phone,
    username: profile.username,
    displayName: profile.display_name,
    verificationStatus: profile.verification_status,
    kycProviderStatus: profile.kyc_provider_status,
    createdAt: profile.created_at,
    updatedAt: profile.updated_at,
  };
}

function toLinkedWallet(row: LinkedDestinationRow): LinkedWallet {
  return {
    id: row.id,
    providerId: row.provider_id,
    name: row.name,
    network: row.network,
    color: row.color,
    initials: row.initials,
    routingType: row.routing_type,
    routingValue: row.routing_value,
    isDefault: row.is_default,
  };
}

function toNotification(row: NotificationRow): NotificationItem {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    body: row.body,
    unread: row.unread,
    createdAt: row.created_at,
  };
}

function formatActivityDate(value: string): string {
  const date = new Date(value);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfValue = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.round((startOfToday.getTime() - startOfValue.getTime()) / 86_400_000);

  if (diffDays === 0) return "Aujourd'hui";
  if (diffDays === 1) return "Hier";

  return new Intl.DateTimeFormat("fr-TN", {
    day: "2-digit",
    month: "short",
  }).format(date);
}

function normalizeAmount(value: number | string): number {
  return typeof value === "number" ? value : Number.parseFloat(value);
}

function buildActivityItem(
  row: TransactionRow,
  currentUserId: string,
  counterparties: Map<string, CounterpartyProfileRow>,
): ActivityItem {
  const isSend = row.sender_user_id === currentUserId;
  const counterpartyId = isSend ? row.recipient_user_id : row.sender_user_id;
  const counterparty = counterpartyId ? counterparties.get(counterpartyId) ?? null : null;

  const fallbackHandle = isSend
    ? `@${row.recipient_username}`
    : row.metadata?.sender_username
      ? `@${row.metadata.sender_username}`
      : "@mou3amla";

  return {
    id: row.id,
    refId: row.ref_id,
    type: isSend ? "send" : "receive",
    counterparty:
      counterparty?.display_name ??
      (isSend ? row.recipient_display_name ?? fallbackHandle : row.metadata?.sender_display_name ?? "Mou3amla user"),
    counterpartyHandle: counterparty ? `@${counterparty.username}` : fallbackHandle,
    wallet: isSend ? row.metadata?.sender_wallet_name ?? "Route Mou3amla" : row.metadata?.recipient_wallet_name ?? "Route Mou3amla",
    amount: normalizeAmount(row.amount),
    date: formatActivityDate(row.created_at),
    status: row.status,
  };
}

async function loadSessionIdentity() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims?.sub) {
    return null;
  }

  return {
    userId: data.claims.sub,
    phone: typeof data.claims.phone === "string" ? data.claims.phone : null,
  };
}

export const getSessionIdentity = cache(loadSessionIdentity);

async function loadCurrentAppUser(): Promise<AuthenticatedAppUser | null> {
  const identity = await loadSessionIdentity();

  if (!identity) {
    return null;
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("profiles")
    .select("id, phone, username, display_name, verification_status, kyc_provider_status, created_at, updated_at")
    .eq("id", identity.userId)
    .maybeSingle<ProfileRow>();

  if (error || !data) {
    return null;
  }

  const profile = toAppProfile(data);
  const [walletsResult, transactionsResult, notificationsResult] = await Promise.all([
    admin
      .from("linked_destinations")
      .select("id, provider_id, name, network, color, initials, routing_type, routing_value, is_default, created_at")
      .eq("user_id", identity.userId)
      .order("created_at", { ascending: true }),
    admin
      .from("payment_transactions")
      .select("id, ref_id, sender_user_id, recipient_user_id, amount, recipient_username, recipient_display_name, status, metadata, created_at")
      .or(`sender_user_id.eq.${identity.userId},recipient_user_id.eq.${identity.userId}`)
      .order("created_at", { ascending: false })
      .limit(40),
    admin
      .from("notifications")
      .select("id, type, title, body, unread, created_at")
      .eq("user_id", identity.userId)
      .order("created_at", { ascending: false })
      .limit(40),
  ]);

  const wallets = ((walletsResult.data ?? []) as LinkedDestinationRow[]).map(toLinkedWallet);
  const transactions = (transactionsResult.data ?? []) as TransactionRow[];
  const notifications = ((notificationsResult.data ?? []) as NotificationRow[]).map(toNotification);

  const counterpartyIds = Array.from(
    new Set(
      transactions.flatMap((transaction) => {
        const ids = [transaction.sender_user_id, transaction.recipient_user_id].filter(Boolean) as string[];
        return ids.filter((id) => id !== identity.userId);
      }),
    ),
  );

  const counterpartyMap = new Map<string, CounterpartyProfileRow>();
  if (counterpartyIds.length > 0) {
    const { data: counterparties } = await admin
      .from("profiles")
      .select("id, username, display_name")
      .in("id", counterpartyIds);

    for (const profileRow of (counterparties ?? []) as CounterpartyProfileRow[]) {
      counterpartyMap.set(profileRow.id, profileRow);
    }
  }

  const activityLog = transactions.map((transaction) => buildActivityItem(transaction, identity.userId, counterpartyMap));
  const sourceWalletId = wallets.find((wallet) => wallet.isDefault)?.id ?? wallets[0]?.id ?? "";

  return {
    id: profile.id,
    phone: profile.phone,
    username: profile.username,
    displayName: profile.displayName,
    verificationStatus: profile.verificationStatus,
    kycProviderStatus: profile.kycProviderStatus,
    wallets,
    sourceWalletId,
    activityLog,
    notifications,
    invoices: [],
  };
}

export const getCurrentAppUser = cache(loadCurrentAppUser);

export async function getCurrentAppUserFresh() {
  return loadCurrentAppUser();
}

export async function requireCurrentAppUser() {
  const user = await getCurrentAppUser();

  if (!user) {
    redirect("/");
  }

  return user;
}

export async function requireCurrentAppUserFresh() {
  const user = await getCurrentAppUserFresh();

  if (!user) {
    redirect("/");
  }

  return user;
}

export async function redirectIfAuthenticated(destination = "/home") {
  const user = await getCurrentAppUser();

  if (user) {
    redirect(destination);
  }
}
