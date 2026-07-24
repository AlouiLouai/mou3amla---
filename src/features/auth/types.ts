import type { LinkedWallet } from "@/features/wallets/types";
import type { ActivityItem } from "@/features/activity/types";
import type { NotificationItem } from "@/features/notifications/types";
import type { Invoice } from "@/features/invoices/types";

export type VerificationStatus = "unverified" | "pending" | "verified" | "rejected";

// The personal card style picked in ProfileBuilderScreen during onboarding
// (see identityGradients in src/features/mou3amla/constants.ts) - null until
// a new user completes that step.
export type CardGradient = "cyan" | "magenta" | "amber" | "emerald" | null;

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
  wallets: LinkedWallet[];
  sourceWalletId: string;
  activityLog: ActivityItem[];
  notifications: NotificationItem[];
  invoices: Invoice[];
  passkeyCount: number;
}
