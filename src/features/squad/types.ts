import type { LinkedWallet } from "@/features/wallets/types";
import type { PaymentIntent, QrToken, ConfettiPiece } from "@/features/payments/types";
import type { Invoice } from "@/features/invoices/types";
import type { ActivityItem } from "@/features/activity/types";

export type { ConfettiPiece };

export type Screen =
  | "auth"
  | "otp"
  | "profile-setup"
  | "home"
  | "wallet-registry"
  | "generate-intent"
  | "receive-qr"
  | "scan-qr"
  | "intent-result"
  | "activity"
  | "invoices"
  | "profile";

export type AuthMode = "signup" | "signin";

export interface UserProfile {
  username: string;
  fullName: string;
  isProfessional: boolean;
  matriculeFiscal?: string;
}

/**
 * There is exactly one real identity per person in production. `AccountId`
 * only exists so this prototype can be demoed as a real two-sided payment —
 * "me" (created via onboarding) and "ahmed" (a pre-seeded counterpart) —
 * without needing a second device or a backend. See docs/06-conventions.md.
 */
export type AccountId = "me" | "ahmed";

export interface AccountState {
  profile: UserProfile;
  wallets: LinkedWallet[];
  sourceWalletId: string;
  activityLog: ActivityItem[];
  invoices: Invoice[];
}

export interface SquadState {
  screen: Screen;
  authMode: AuthMode;
  phoneInput: string;
  otpInput: string;
  onboarded: boolean;
  fullNameInput: string;
  matriculeFiscalInput: string;
  linkOpen: boolean;
  linkStep: "provider" | "identifier";
  linkProviderId: string | null;
  linkIdentifierInput: string;
  linkConnectingId: string | null;
  recipientInput: string;
  amount: string;
  currentIntent: PaymentIntent | null;
  qrToken: QrToken | null;
  scanManualInput: string;
  confetti: ConfettiPiece[];
  accounts: Record<AccountId, AccountState>;
  activeAccountId: AccountId;
  accountSwitcherOpen: boolean;
}
