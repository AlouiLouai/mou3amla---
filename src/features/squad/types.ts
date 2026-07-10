export type Screen = "auth" | "home" | "kyc" | "transfer" | "activity" | "profile";
export type AuthMode = "signup" | "signin";
export type KycStep = "intro" | "front" | "back" | "liveness" | "processing" | "success";
export type TransferRole = "send" | "receive";
export type TransferStep = "input" | "transmit" | "handshake" | "biometric" | "success";

export interface Wallet {
  id: string;
  name: string;
  tag: string;
  balance: number;
  network: string;
  color: string;
  initials: string;
}

export interface Provider {
  id: string;
  name: string;
  initials: string;
  color: string;
  network: string;
  subtitle: string;
  /** Balance seeded when a coworker links this provider in the demo flow. */
  mockBalance: number;
}

export interface ActivityItem {
  id: string;
  type: TransferRole;
  counterparty: string;
  wallet: string;
  amount: number;
  date: string;
}

export interface ConfettiPiece {
  left: string;
  delay: string;
  dur: string;
  color: string;
}

export interface SquadState {
  screen: Screen;
  authMode: AuthMode;
  phoneInput: string;
  verified: boolean;
  kycStep: KycStep;
  kycSessionId: string;
  linkOpen: boolean;
  linkConnectingId: string | null;
  wallets: Wallet[];
  transferRole: TransferRole;
  transferStep: TransferStep;
  sourceWalletId: string;
  amount: string;
  handshakeIndex: number;
  txId: string;
  activityLog: ActivityItem[];
  confetti: ConfettiPiece[];
}
