import type { LinkedWallet } from "@/features/wallets/types";
import { isMockCheckoutProvider } from "@/features/payments/lib/provider-checkout";
import type { ActivityItem } from "@/features/activity/types";

export interface RecentContact {
  handle: string;
  username: string;
  name: string;
  initials: string;
  color: string;
}

// No stored per-person color exists (unlike wallets, which carry a real
// provider brand color) - hashing the handle into a small fixed palette
// gives each contact a stable, distinct-enough avatar tint across renders
// without persisting anything new.
const AVATAR_COLORS = ["#7A3EF0", "#14B8A6", "#D97706", "#DC2626", "#0095F6", "#DB2777"];

export function avatarColorFor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

export function initialsFor(name: string): string {
  return (
    name
      .split(" ")
      .map((part) => part[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?"
  );
}

// "Quick send" / "Contacts" is derived, not stored - every unique person
// this account has ever *sent* money to (receiving doesn't count someone as
// a contact to send back to by default), most-recent-first since
// activityLog itself is already ordered that way.
export function getRecentContacts(activityLog: ActivityItem[]): RecentContact[] {
  const seen = new Set<string>();
  const contacts: RecentContact[] = [];

  for (const item of activityLog) {
    if (item.type !== "send") continue;
    if (seen.has(item.counterpartyHandle)) continue;
    seen.add(item.counterpartyHandle);

    contacts.push({
      handle: item.counterpartyHandle,
      username: item.counterpartyHandle.replace(/^@/, ""),
      name: item.counterparty,
      initials: initialsFor(item.counterparty),
      color: avatarColorFor(item.counterpartyHandle),
    });
  }

  return contacts;
}

export function makeConfetti() {
  const colors = ["#0095F6", "#7A3EF0", "#ED4956", "#FFFFFF"];
  return Array.from({ length: 24 }, (_, i) => ({
    left: `${(Math.random() * 92 + 2).toFixed(1)}%`,
    delay: `${(Math.random() * 1.2).toFixed(2)}s`,
    dur: `${(1.6 + Math.random() * 1.2).toFixed(2)}s`,
    color: colors[i % colors.length],
  }));
}

export function applyDefaultWallet(wallets: LinkedWallet[], selectedId: string) {
  return wallets.map((wallet) => ({
    ...wallet,
    isDefault: wallet.id === selectedId,
  }));
}

export function getMockCheckoutWallets(wallets: LinkedWallet[]) {
  return wallets.filter((wallet) => isMockCheckoutProvider(wallet.providerId));
}

export function getPreferredSendWalletId(wallets: LinkedWallet[], preferredId: string) {
  const supportedWallets = getMockCheckoutWallets(wallets);

  if (supportedWallets.some((wallet) => wallet.id === preferredId)) {
    return preferredId;
  }

  return supportedWallets[0]?.id ?? "";
}

export function vibrate(pattern: number | number[]) {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    navigator.vibrate(pattern);
  }
}
