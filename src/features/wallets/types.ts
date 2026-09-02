/**
 * How a provider is addressed for routing purposes. Mou3amla only ever stores
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
  /** "mock" = internal /dev/mock-checkout; "hosted" = real provider hosted sandbox checkout (Flouci today - see docs/09-bct-sandbox-readiness.md); "service_down" = temporary sandbox outage, blocks linking/checkout (Konnect today); "pending_approval" = waiting on business-registration/KYB, also blocks linking/checkout (currently unused). */
  demoCheckoutStatus?: "mock" | "hosted" | "service_down" | "pending_approval";
  /** Overrides WalletRegistrySheet's default routing-type placeholder for this provider only. */
  routingPlaceholder?: string;
  /** True only for the foreign-card provider a tourist links instead of a Tunisian wallet/bank (see AccountType in auth/types.ts). */
  international?: boolean;
}

/** A linked destination — Mou3amla never sees or stores a balance for this. */
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
