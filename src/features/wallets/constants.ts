import { squad } from "@/features/squad/constants";
import type { LinkedWallet, Provider } from "@/features/wallets/types";

// Real Tunisian mobile-money / e-payment providers operating under the
// TUNPAY interoperability label. Each only exposes the routing identifier
// types it actually supports — SQUAD never stores a balance for any of
// these, only the destination-only string the user provides.
export const PROVIDERS: Provider[] = [
  {
    id: "flouci",
    name: "Flouci",
    initials: "FL",
    color: "#2FE6A3",
    network: "Flouci · TUNPAY",
    subtitle: "Mobile Wallet · TUNPAY",
    acceptedRoutingTypes: ["wallet_tag", "merchant_id"],
  },
  {
    id: "walletii",
    name: "walletii by Ooredoo",
    initials: "WT",
    color: "#A78BFA",
    network: "Ooredoo · TUNPAY",
    subtitle: "Mobile Wallet · TUNPAY",
    acceptedRoutingTypes: ["wallet_tag"],
  },
  {
    id: "d17",
    name: "D17 (La Poste)",
    initials: "D17",
    color: "#ECA310",
    network: "La Poste · TUNPAY",
    subtitle: "Mobile Wallet · La Poste",
    acceptedRoutingTypes: ["wallet_tag", "merchant_id"],
  },
  {
    id: "orangemoney",
    name: "Orange Money",
    initials: "OM",
    color: "#FF7900",
    network: "Orange · TUNPAY",
    subtitle: "Mobile Wallet · TUNPAY",
    acceptedRoutingTypes: ["wallet_tag"],
  },
  {
    id: "zitounapay",
    name: "Zitouna Pay",
    initials: "ZP",
    color: "#1FAA7C",
    network: "Banque Zitouna · TUNPAY",
    subtitle: "Mobile Wallet · TUNPAY",
    acceptedRoutingTypes: ["wallet_tag"],
  },
  {
    id: "sobflous",
    name: "Sobflous",
    initials: "SF",
    color: "#64748B",
    network: "Sobflous · TUNPAY",
    subtitle: "Electronic Wallet",
    acceptedRoutingTypes: ["wallet_tag"],
  },
  {
    id: "biat",
    name: "BIAT",
    initials: "BI",
    color: "#22A879",
    network: "BIAT · Interbank",
    subtitle: "Bank Account · RIB",
    acceptedRoutingTypes: ["rib"],
  },
  {
    id: "amenpay",
    name: "Amen Pay",
    initials: "AP",
    color: "#3B6FE0",
    network: "Amen Bank · Interbank",
    subtitle: "Bank Account · RIB",
    acceptedRoutingTypes: ["rib"],
  },
  {
    id: "attijari",
    name: "Attijari Real Time",
    initials: "AT",
    color: "#E0486B",
    network: "Attijari Bank · Interbank",
    subtitle: "Bank Account · RIB",
    acceptedRoutingTypes: ["rib"],
  },
  {
    id: "clictopay",
    name: "ClicToPay (SMT)",
    initials: "CP",
    color: squad.text,
    network: "SMT · Interbank",
    subtitle: "Bank Card / RIB · ClicToPay",
    acceptedRoutingTypes: ["rib"],
  },
];

export const ME_INITIAL_WALLETS: LinkedWallet[] = [
  {
    id: "flouci",
    providerId: "flouci",
    name: "Flouci",
    network: "Flouci",
    color: "#2FE6A3",
    initials: "FL",
    routingType: "wallet_tag",
    routingValue: "@youssef.tn",
  },
  {
    id: "walletii",
    providerId: "walletii",
    name: "walletii by Ooredoo",
    network: "Ooredoo",
    color: "#A78BFA",
    initials: "WT",
    routingType: "wallet_tag",
    routingValue: "@youssef.wt",
  },
];

// A pre-seeded, already-onboarded second persona so this prototype can
// demo a real two-sided payment (switch accounts, send, switch back, see it
// land) without a second device or a backend. See docs/06-conventions.md.
export const AHMED_PROFILE = {
  username: "ahmed_k",
  fullName: "Ahmed Karray",
  isProfessional: true,
  matriculeFiscal: "1357902K/A/M/000",
} as const;

export const AHMED_INITIAL_WALLETS: LinkedWallet[] = [
  {
    id: "attijari-ahmed",
    providerId: "attijari",
    name: "Attijari Real Time",
    network: "Attijari",
    color: "#E0486B",
    initials: "AT",
    routingType: "rib",
    routingValue: "10123456789012345678",
  },
];
