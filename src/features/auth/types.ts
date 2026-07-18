import type { LinkedWallet } from "@/features/wallets/types";
import type { ActivityItem } from "@/features/activity/types";
import type { NotificationItem } from "@/features/notifications/types";
import type { Invoice } from "@/features/invoices/types";

export type VerificationStatus = "unverified" | "pending" | "verified" | "rejected";

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
  wallets: LinkedWallet[];
  sourceWalletId: string;
  activityLog: ActivityItem[];
  notifications: NotificationItem[];
  invoices: Invoice[];
}
