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
