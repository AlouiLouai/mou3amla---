/**
 * How a provider is addressed for routing purposes. SQUAD only ever stores
 * the destination-only public identifier, never a balance or credential.
 */
export type RoutingType = "wallet_tag" | "merchant_id" | "rib";

export interface Provider {
  id: string;
  name: string;
  initials: string;
  color: string;
  network: string;
  subtitle: string;
  acceptedRoutingTypes: RoutingType[];
}

/** A linked destination — SQUAD never sees or stores a balance for this. */
export interface LinkedWallet {
  id: string;
  providerId: string;
  name: string;
  network: string;
  color: string;
  initials: string;
  routingType: RoutingType;
  /** Wallet tag, merchant id, or RIB — public routing string only. */
  routingValue: string;
  isDefault?: boolean;
}
