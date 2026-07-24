import { mou3amla } from "@/features/mou3amla/constants";
import type { Provider } from "@/features/wallets/types";

// Real Tunisian mobile-money / e-payment providers operating under the
// TUNPAY interoperability label. Each only exposes the routing identifier
// types it actually supports. Mou3amla never stores a balance for any of
// these, only the destination-only string the user provides.
export const PROVIDERS: Provider[] = [
  {
    id: "flouci",
    name: "Flouci",
    initials: "FL",
    color: "#2FE6A3",
    network: "Flouci - TUNPAY",
    subtitle: "Mobile Wallet - Awaiting business registration approval",
    acceptedRoutingTypes: ["wallet_tag", "merchant_id"],
    demoCheckoutStatus: "pending_approval",
  },
  {
    id: "konnect",
    name: "Konnect",
    initials: "KN",
    color: "#0E7490",
    network: "Konnect - Checkout",
    subtitle: "Hosted Checkout - Temporarily down in this demo",
    acceptedRoutingTypes: ["merchant_id"],
    demoCheckoutStatus: "service_down",
  },
  {
    id: "walletii",
    name: "walletii by Ooredoo",
    initials: "WT",
    color: "#A78BFA",
    network: "Ooredoo - TUNPAY",
    subtitle: "Mobile Wallet - TUNPAY",
    acceptedRoutingTypes: ["wallet_tag"],
    demoCheckoutStatus: "mock",
  },
  {
    id: "d17",
    name: "D17 (La Poste)",
    initials: "D17",
    color: "#ECA310",
    network: "La Poste - TUNPAY",
    subtitle: "Mobile Wallet - La Poste",
    acceptedRoutingTypes: ["wallet_tag", "merchant_id"],
    demoCheckoutStatus: "mock",
  },
  {
    id: "orangemoney",
    name: "Orange Money",
    initials: "OM",
    color: "#FF7900",
    network: "Orange - TUNPAY",
    subtitle: "Mobile Wallet - TUNPAY",
    acceptedRoutingTypes: ["wallet_tag"],
    demoCheckoutStatus: "mock",
  },
  {
    id: "zitounapay",
    name: "Zitouna Pay",
    initials: "ZP",
    color: "#1FAA7C",
    network: "Banque Zitouna - TUNPAY",
    subtitle: "Mobile Wallet - TUNPAY",
    acceptedRoutingTypes: ["wallet_tag"],
    demoCheckoutStatus: "mock",
  },
  {
    id: "sobflous",
    name: "Sobflous",
    initials: "SF",
    color: "#64748B",
    network: "Sobflous - TUNPAY",
    subtitle: "Electronic Wallet",
    acceptedRoutingTypes: ["wallet_tag"],
    demoCheckoutStatus: "mock",
  },
  {
    id: "biat",
    name: "BIAT",
    initials: "BI",
    color: "#22A879",
    network: "BIAT - Interbank",
    subtitle: "Bank Account - RIB",
    acceptedRoutingTypes: ["rib"],
    demoCheckoutStatus: "mock",
  },
  {
    id: "amenpay",
    name: "Amen Pay",
    initials: "AP",
    color: "#3B6FE0",
    network: "Amen Bank - Interbank",
    subtitle: "Bank Account - RIB",
    acceptedRoutingTypes: ["rib"],
    demoCheckoutStatus: "mock",
  },
  {
    id: "attijari",
    name: "Attijari Real Time",
    initials: "AT",
    color: "#E0486B",
    network: "Attijari Bank - Interbank",
    subtitle: "Bank Account - RIB",
    acceptedRoutingTypes: ["rib"],
    demoCheckoutStatus: "mock",
  },
  {
    id: "clictopay",
    name: "ClicToPay (SMT)",
    initials: "CP",
    color: mou3amla.text,
    network: "SMT - Interbank",
    subtitle: "Bank Card / RIB - ClicToPay",
    acceptedRoutingTypes: ["rib"],
    demoCheckoutStatus: "mock",
  },
];

export function getProviderById(providerId: string) {
  return PROVIDERS.find((provider) => provider.id === providerId) ?? null;
}

export function isProviderServiceDown(providerId: string) {
  const status = getProviderById(providerId)?.demoCheckoutStatus;
  return status === "service_down" || status === "pending_approval";
}

export function isProviderPendingApproval(providerId: string) {
  return getProviderById(providerId)?.demoCheckoutStatus === "pending_approval";
}

export function canUseMockCheckout(providerId: string) {
  return getProviderById(providerId)?.demoCheckoutStatus === "mock";
}

export function canUseHostedCheckout(providerId: string) {
  return getProviderById(providerId)?.demoCheckoutStatus === "hosted";
}
