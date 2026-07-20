export type IntentStatus = "building" | "dispatched" | "confirmed";
export type PersistedTransactionStatus = "initiated" | "confirmed" | "failed";

export type HostedCheckoutProviderId = "flouci" | "konnect";

export interface PaymentIntent {
  id: string;
  refId: string;
  amount: number;
  recipient: string;
  recipientDisplayName?: string;
  sourceWalletId: string;
  createdAt: number;
  status: IntentStatus;
}

export interface PaymentCheckoutLaunch {
  providerId: string;
  providerName: string;
  url: string;
}

/** Rotating proximity token encoded into the receive-screen QR code. */
export interface QrToken {
  token: string;
  recipientUserId: string;
  recipient: string;
  nonce: string;
  issuedAt: number;
  expiresAt: number;
  signatureVersion: string;
}

export type NearbyMatchStatus = "published" | "matched" | "confirmed";

export interface NearbyHandoff {
  code: string;
  expiresAt: number;
  status: NearbyMatchStatus;
  ownerAccepted: boolean;
  payerAccepted: boolean;
}

export interface NearbyMatchState {
  code: string;
  status: NearbyMatchStatus;
  ownerAccepted: boolean;
  payerAccepted: boolean;
  expiresAt: number;
}

export interface ConfettiPiece {
  left: string;
  delay: string;
  dur: string;
  color: string;
}

export interface RecipientPreview {
  userId: string;
  username: string;
  displayName: string;
  verificationStatus: "unverified" | "pending" | "verified" | "rejected";
  primaryRouteLabel: string | null;
}
