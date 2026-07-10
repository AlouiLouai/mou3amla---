import type { Provider, Wallet } from "@/features/squad/types";

// SQUAD's palette is a fixed dark fintech theme, independent of the app's
// light/dark shadcn theme — the design is intentionally always-dark.
export const squad = {
  bg: "#08090A",
  surface: "#0A0B0D",
  card: "#131417",
  cardAlt: "#17181C",
  text: "#F4F5F6",
  green: "#00FFA0",
  purple: "#B478FF",
  red: "#FF6B6B",
  amber: "#FFC24B",
} as const;

/** e.g. alpha(squad.green, 0.14) -> "rgba(0, 255, 160, 0.14)" */
export function alpha(hex: string, opacity: number): string {
  const value = parseInt(hex.slice(1), 16);
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

export const PROVIDERS: Provider[] = [
  {
    id: "flouci",
    name: "Flouci",
    initials: "FL",
    color: squad.green,
    network: "Flouci · TUNPAY",
    subtitle: "Mobile Wallet · TUNPAY",
    mockBalance: 128.75,
  },
  {
    id: "ooredoo",
    name: "Ooredoo M-Tidjar",
    initials: "OM",
    color: squad.purple,
    network: "Ooredoo · TUNPAY",
    subtitle: "Mobile Wallet · TUNPAY",
    mockBalance: 42.5,
  },
  {
    id: "clictopay",
    name: "e-Dinar · BIAT",
    initials: "CP",
    color: squad.text,
    network: "ClicToPay",
    subtitle: "Interbank Card · ClicToPay",
    mockBalance: 615.2,
  },
  {
    id: "walletii",
    name: "Walletii",
    initials: "WT",
    color: squad.amber,
    network: "Walletii · TUNPAY",
    subtitle: "Mobile Wallet · TUNPAY",
    mockBalance: 34.9,
  },
];

export const INITIAL_WALLETS: Wallet[] = [
  {
    id: "flouci",
    name: "Flouci",
    tag: "@youssef.tn",
    balance: 128.75,
    network: "Flouci",
    color: squad.green,
    initials: "FL",
  },
  {
    id: "ooredoo",
    name: "Ooredoo M-Tidjar",
    tag: "M-Tidjar •• 4821",
    balance: 42.5,
    network: "Ooredoo",
    color: squad.purple,
    initials: "OM",
  },
];

export function formatDT(amount: number): string {
  return amount.toFixed(3);
}
