import "server-only";

import { serverEnv } from "@/config/env.server";
import type { SupportedCheckoutProviderId } from "@/features/payments/types";
import { isSupportedCheckoutProvider } from "@/features/payments/lib/provider-checkout";
import { logger } from "@/lib/logger";

const REQUEST_TIMEOUT_MS = 15_000;
const DEFAULT_KONNECT_BASE_URL = "https://api.sandbox.konnect.network/api/v2";
const DEFAULT_FLOUCI_BASE_URL = "https://developers.flouci.com/api/v2";

type CreateCheckoutInput = {
  providerId: string;
  providerName: string;
  refId: string;
  amount: number;
  payerPhone: string | null;
  recipientHandle: string;
};

export type CreateCheckoutResult =
  | {
      ok: true;
      providerId: SupportedCheckoutProviderId;
      providerName: string;
      checkoutUrl: string;
      providerPaymentRef: string;
      providerStatus: string;
      returnUrl: string;
      webhookUrl: string;
    }
  | { ok: false; message: string };

export type ProviderVerificationResult =
  | {
      ok: true;
      providerId: SupportedCheckoutProviderId;
      providerStatus: string;
      resolvedStatus: "initiated" | "confirmed" | "failed";
      providerPaymentRef: string;
      failureReason?: string;
    }
  | { ok: false; message: string };

type ProviderTransactionMetadataShape = {
  provider_id?: string;
  provider_name?: string;
  provider_payment_ref?: string;
};

function getAppUrl() {
  const appUrl = serverEnv.NEXT_PUBLIC_APP_URL;
  return appUrl ? appUrl.replace(/\/+$/, "") : null;
}

function getDigitsOnlyPhone(phone: string | null): string | undefined {
  if (!phone) return undefined;
  const digits = phone.replace(/\D/g, "");
  if (digits.length >= 8) {
    return digits.slice(-8);
  }
  return undefined;
}

async function readJson<T>(input: string, init: RequestInit): Promise<T> {
  const response = await fetch(input, {
    ...init,
    signal: init.signal ?? AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  const text = await response.text();
  let parsed: unknown = null;

  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = text;
    }
  }

  if (!response.ok) {
    logger.warn("Provider checkout request failed", {
      provider_url: input,
      status: response.status,
      response_body: typeof parsed === "string" ? parsed.slice(0, 400) : parsed,
    });
    throw new Error(`Provider request failed with status ${response.status}`);
  }

  return parsed as T;
}

async function createKonnectCheckout(input: Omit<CreateCheckoutInput, "providerId">): Promise<CreateCheckoutResult> {
  const appUrl = getAppUrl();
  const apiKey = serverEnv.KONNECT_API_KEY;
  const receiverWalletId = serverEnv.KONNECT_RECEIVER_WALLET_ID;

  if (!appUrl || !apiKey || !receiverWalletId) {
    return { ok: false, message: "Konnect sandbox keys are not configured yet for this demo." };
  }

  const returnUrl = `${appUrl}/payments/return/konnect?ref=${encodeURIComponent(input.refId)}`;
  const webhookUrl = `${appUrl}/api/payments/providers/konnect/webhook?ref=${encodeURIComponent(input.refId)}`;
  const payerPhone = getDigitsOnlyPhone(input.payerPhone);

  type KonnectCreateResponse = {
    payUrl?: string;
    paymentRef?: string;
  };

  const payload = await readJson<KonnectCreateResponse>(`${serverEnv.KONNECT_API_BASE_URL ?? DEFAULT_KONNECT_BASE_URL}/payments/init-payment`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
    },
    body: JSON.stringify({
      receiverWalletId,
      token: "TND",
      amount: Math.round(input.amount * 1000),
      type: "immediate",
      description: `Mou3amla payment to ${input.recipientHandle}`,
      acceptedPaymentMethods: ["wallet", "bank_card", "e-DINAR"],
      lifespan: 10,
      checkoutForm: true,
      addPaymentFeesToAmount: false,
      orderId: input.refId,
      webhook: webhookUrl,
      silentWebhook: true,
      successUrl: returnUrl,
      failUrl: returnUrl,
      ...(payerPhone ? { phoneNumber: payerPhone } : {}),
    }),
  });

  if (!payload.payUrl || !payload.paymentRef) {
    return { ok: false, message: "Konnect did not return a valid checkout session." };
  }

  return {
    ok: true,
    providerId: "konnect",
    providerName: input.providerName,
    checkoutUrl: payload.payUrl,
    providerPaymentRef: payload.paymentRef,
    providerStatus: "pending",
    returnUrl,
    webhookUrl,
  };
}

async function createFlouciCheckout(input: Omit<CreateCheckoutInput, "providerId">): Promise<CreateCheckoutResult> {
  const appUrl = getAppUrl();
  const publicKey = serverEnv.FLOUCI_PUBLIC_KEY;
  const privateKey = serverEnv.FLOUCI_PRIVATE_KEY;

  if (!appUrl || !publicKey || !privateKey) {
    return { ok: false, message: "Flouci sandbox keys are not configured yet for this demo." };
  }

  const returnUrl = `${appUrl}/payments/return/flouci?ref=${encodeURIComponent(input.refId)}`;
  const webhookUrl = `${appUrl}/api/payments/providers/flouci/webhook?ref=${encodeURIComponent(input.refId)}`;

  type FlouciCreateResponse = {
    result?: {
      success?: boolean;
      payment_id?: string;
      link?: string;
    };
  };

  const payload = await readJson<FlouciCreateResponse>(`${serverEnv.FLOUCI_API_BASE_URL ?? DEFAULT_FLOUCI_BASE_URL}/generate_payment`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${publicKey}:${privateKey}`,
    },
    body: JSON.stringify({
      amount: Math.round(input.amount * 1000).toString(),
      success_link: returnUrl,
      fail_link: returnUrl,
      webhook: webhookUrl,
      developer_tracking_id: input.refId,
      session_timeout_secs: 1200,
      accept_card: true,
      client_id: input.recipientHandle,
    }),
  });

  if (!payload.result?.success || !payload.result.payment_id || !payload.result.link) {
    return { ok: false, message: "Flouci did not return a valid checkout session." };
  }

  return {
    ok: true,
    providerId: "flouci",
    providerName: input.providerName,
    checkoutUrl: payload.result.link,
    providerPaymentRef: payload.result.payment_id,
    providerStatus: "PENDING",
    returnUrl,
    webhookUrl,
  };
}

export async function createProviderCheckout(input: CreateCheckoutInput): Promise<CreateCheckoutResult> {
  if (!isSupportedCheckoutProvider(input.providerId)) {
    return { ok: false, message: "This payment rail is visible in the demo, but only Flouci and Konnect are wired to a live sandbox today." };
  }

  if (input.providerId === "konnect") {
    return createKonnectCheckout(input);
  }

  return createFlouciCheckout(input);
}

async function verifyKonnectPayment(providerPaymentRef: string): Promise<ProviderVerificationResult> {
  const apiKey = serverEnv.KONNECT_API_KEY;
  if (!apiKey) {
    return { ok: false, message: "Konnect sandbox keys are not configured yet for this demo." };
  }

  type KonnectPaymentDetails = {
    payment?: {
      status?: string;
      transactions?: Array<{ status?: string }>;
    };
  };

  const payload = await readJson<KonnectPaymentDetails>(`${serverEnv.KONNECT_API_BASE_URL ?? DEFAULT_KONNECT_BASE_URL}/payments/${providerPaymentRef}`, {
    method: "GET",
    headers: {
      "x-api-key": apiKey,
    },
  });

  const providerStatus = payload.payment?.status?.toLowerCase() ?? "pending";
  const transactionSucceeded = payload.payment?.transactions?.some((transaction) => transaction.status?.toLowerCase() === "success") ?? false;

  return {
    ok: true,
    providerId: "konnect",
    providerStatus,
    resolvedStatus: providerStatus === "completed" && transactionSucceeded ? "confirmed" : "initiated",
    providerPaymentRef,
  };
}

async function verifyFlouciPayment(providerPaymentRef: string): Promise<ProviderVerificationResult> {
  const publicKey = serverEnv.FLOUCI_PUBLIC_KEY;
  const privateKey = serverEnv.FLOUCI_PRIVATE_KEY;
  if (!publicKey || !privateKey) {
    return { ok: false, message: "Flouci sandbox keys are not configured yet for this demo." };
  }

  type FlouciVerifyPayload = {
    success?: boolean;
    result?: {
      status?: string;
    };
  };

  const payload = await readJson<FlouciVerifyPayload>(`${serverEnv.FLOUCI_API_BASE_URL ?? DEFAULT_FLOUCI_BASE_URL}/verify_payment/${providerPaymentRef}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${publicKey}:${privateKey}`,
    },
  });

  const providerStatus = payload.result?.status?.toUpperCase() ?? "PENDING";
  const resolvedStatus =
    providerStatus === "SUCCESS" ? "confirmed" : providerStatus === "FAILURE" || providerStatus === "EXPIRED" ? "failed" : "initiated";

  return {
    ok: true,
    providerId: "flouci",
    providerStatus,
    resolvedStatus,
    providerPaymentRef,
    failureReason: resolvedStatus === "failed" ? providerStatus : undefined,
  };
}

export async function verifyProviderPayment(
  providerId: string,
  metadata: ProviderTransactionMetadataShape | null | undefined,
): Promise<ProviderVerificationResult> {
  if (!isSupportedCheckoutProvider(providerId)) {
    return { ok: false, message: "This payment rail is not wired to a sandbox verification flow." };
  }

  const providerPaymentRef = metadata?.provider_payment_ref;
  if (!providerPaymentRef) {
    return { ok: false, message: "We couldn't find the provider payment reference for this transaction." };
  }

  if (providerId === "konnect") {
    return verifyKonnectPayment(providerPaymentRef);
  }

  return verifyFlouciPayment(providerPaymentRef);
}
