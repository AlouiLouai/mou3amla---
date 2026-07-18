import type { LinkedWallet } from "@/features/wallets/types";

export function makeConfetti() {
  const colors = ["#FF0083", "#FF8D28", "#050505", "#FFC4E3"];
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

export function vibrate(pattern: number | number[]) {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    navigator.vibrate(pattern);
  }
}
