import type { LinkedWallet } from "@/features/wallets/types";
import type { PaymentIntent, QrToken, NearbyHandoff, NearbyMatchState, ConfettiPiece, RecipientPreview } from "@/features/payments/types";
import type { Invoice } from "@/features/invoices/types";
import type { ActivityItem } from "@/features/activity/types";
import type { VerificationStatus } from "@/features/auth/types";
import type { NotificationItem } from "@/features/notifications/types";

export type { ConfettiPiece };

export type Screen =
  | "home"
  | "wallet-registry"
  | "accounts"
  | "generate-intent"
  | "receive-qr"
  | "scan-qr"
  | "intent-result"
  | "activity"
  | "invoices"
  | "profile"
  | "notifications";

export interface UserProfile {
  phone?: string;
  username: string;
  fullName: string;
  isProfessional: boolean;
  verificationStatus: VerificationStatus;
  matriculeFiscal?: string;
}

export interface InitialSquadUser {
  phone: string;
  username: string;
  displayName: string;
  verificationStatus: VerificationStatus;
  wallets: LinkedWallet[];
  sourceWalletId: string;
  activityLog: ActivityItem[];
  notifications: NotificationItem[];
  invoices: Invoice[];
}

export type HandoffMode = "qr" | "nearby";

export interface SquadState {
  screen: Screen;
  initialHandoffMode: HandoffMode;
  linkOpen: boolean;
  linkStep: "provider" | "identifier";
  linkProviderId: string | null;
  linkIdentifierInput: string;
  linkConnectingId: string | null;
  recipientInput: string;
  recipientPreview: RecipientPreview | null;
  amount: string;
  currentIntent: PaymentIntent | null;
  qrToken: QrToken | null;
  nearbyHandoff: NearbyHandoff | null;
  payerMatch: NearbyMatchState | null;
  nearbyOptions: string[];
  isLoadingNearbyOptions: boolean;
  scanManualInput: string;
  confetti: ConfettiPiece[];
  isSendingPayment: boolean;
  profile: UserProfile;
  wallets: LinkedWallet[];
  sourceWalletId: string;
  activityLog: ActivityItem[];
  notifications: NotificationItem[];
  invoices: Invoice[];
}
