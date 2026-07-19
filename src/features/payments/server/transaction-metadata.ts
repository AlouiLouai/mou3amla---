export type PaymentTransactionMetadata = {
  sender_display_name?: string;
  sender_username?: string;
  sender_wallet_name?: string;
  recipient_wallet_name?: string;
  provider_id?: string;
  provider_name?: string;
  provider_checkout_url?: string;
  provider_payment_ref?: string;
  provider_status?: string;
  provider_verified_at?: string;
  provider_failure_reason?: string;
  provider_return_url?: string;
  provider_webhook_url?: string;
  demo_checkout_mode?: "hosted";
};
