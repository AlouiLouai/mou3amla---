import type { LinkedWallet } from "@/features/wallets/types";
import { isSupportedCheckoutProvider } from "@/features/payments/lib/provider-checkout";

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

export function getSupportedCheckoutWallets(wallets: LinkedWallet[]) {
  return wallets.filter((wallet) => isSupportedCheckoutProvider(wallet.providerId));
}

export function getPreferredSendWalletId(wallets: LinkedWallet[], preferredId: string) {
  const supportedWallets = getSupportedCheckoutWallets(wallets);

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
