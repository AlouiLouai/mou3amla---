import type { LinkedWallet } from "@/features/wallets/types";
import type { ActivityItem } from "@/features/activity/types";
import type { NotificationItem } from "@/features/notifications/types";
import type { Invoice } from "@/features/invoices/types";

export type VerificationStatus = "unverified" | "pending" | "verified" | "rejected";

// The personal card style picked in ProfileBuilderScreen during onboarding
// (see identityGradients in src/features/mou3amla/constants.ts) - null until
// a new user completes that step.
export type CardGradient = "cyan" | "magenta" | "amber" | "emerald" | null;

// A visiting tourist has no Tunisian bank/wallet destination to ever
// receive into - Mou3amla gates the receive side of the app on this (home
// quick actions, the smart scan tab, goReceiveQr). Chosen once during
// onboarding, defaults to "resident" for every existing profile.
export type AccountType = "resident" | "tourist";

export interface AuthFormState {
  errors?: {
    phone?: string[];
    username?: string[];
  };
  message?: string;
}

export interface PasskeyBridgeResult {
  ok: boolean;
  message?: string;
}

export interface AppProfileRecord {
  id: string;
  phone: string;
  username: string;
  displayName: string;
  verificationStatus: VerificationStatus;
  kycProviderStatus: string | null;
  cardGradient: CardGradient;
  accountType: AccountType;
  createdAt: string;
  updatedAt: string;
}

export interface AuthenticatedAppUser {
  id: string;
  phone: string;
  username: string;
  displayName: string;
  verificationStatus: VerificationStatus;
  kycProviderStatus: string | null;
  cardGradient: CardGradient;
  accountType: AccountType;
  wallets: LinkedWallet[];
  sourceWalletId: string;
  activityLog: ActivityItem[];
  notifications: NotificationItem[];
  invoices: Invoice[];
  passkeyCount: number;
}
