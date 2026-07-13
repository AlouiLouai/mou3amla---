export type IntentStatus = "building" | "dispatched" | "confirmed";
export type PersistedTransactionStatus = "initiated" | "confirmed" | "failed";

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

export interface NearbyHandoff {
  code: string;
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
