import { squad } from "@/features/squad/constants";
import type { Provider } from "@/features/wallets/types";

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
