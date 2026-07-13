import type { RoutingType } from "@/features/wallets/types";

export const ROUTING_LABELS: Record<RoutingType, string> = {
  wallet_tag: "Tag",
  merchant_id: "Merchant",
  rib: "RIB",
};

export function maskRoutingValue(value: string): string {
  if (value.startsWith("@")) return value;
  if (value.length <= 4) return value;
  return `..${value.slice(-4)}`;
}
