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
  /** "service_down" = temporary sandbox outage (Konnect); "pending_approval"
   * = waiting on a real business-registration/KYB step before sandbox
   * onboarding can open (Flouci) - see docs/09-bct-sandbox-readiness.md. Both
   * are unavailable for linking/checkout, only the reason shown differs. */
  demoCheckoutStatus?: "mock" | "hosted" | "service_down" | "pending_approval";
  /** Overrides WalletRegistrySheet's default routing-type placeholder for
   * this one provider (e.g. "international" isn't a real wallet_tag/
   * merchant_id/rib provider, just reuses wallet_tag's validation shape) -
   * leave unset to use the routing-type default every other provider shares. */
  routingPlaceholder?: string;
  /** True only for the foreign-card/e-wallet provider a tourist already
   * holds (see AccountType in auth/types.ts) - a tourist has no Tunisian
   * bank/wallet destination to link, so linking filters to only this
   * provider for them, and residents never see it. Unset/false for every
   * Tunisian TUNPAY/interbank provider. */
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
