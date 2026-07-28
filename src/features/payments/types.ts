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
  amount: number | null;
  /** The matched payer's @username, shown as soon as `status` leaves
   * "published" so the owner can visually confirm this is the right person
   * before accepting - null until someone has actually claimed the code. */
  counterpartUsername: string | null;
}

export interface NearbyMatchState {
  code: string;
  status: NearbyMatchStatus;
  ownerAccepted: boolean;
  payerAccepted: boolean;
  expiresAt: number;
  amount: number | null;
  /** The host's @username, known as soon as the payer claims a code (they
   * always know which owner's code they claimed) - shown so the payer can
   * visually confirm this is the right person before accepting. */
  counterpartUsername: string | null;
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
