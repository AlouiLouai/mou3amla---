export type IntentStatus = "building" | "dispatched" | "confirmed";

export interface PaymentIntent {
  id: string;
  refId: string;
  amount: number;
  recipient: string;
  sourceWalletId: string;
  createdAt: number;
  status: IntentStatus;
}

/** Rotating proximity token encoded into the receive-screen QR code. */
export interface QrToken {
  recipient: string;
  nonce: string;
  issuedAt: number;
  expiresAt: number;
}

export interface ConfettiPiece {
  left: string;
  delay: string;
  dur: string;
  color: string;
}
