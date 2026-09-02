import "server-only";

import { serverEnv } from "@/config/env.server";
import type { HostedCheckoutProviderId } from "@/features/payments/types";
import {
  canLaunchProviderCheckout,
  isCheckoutServiceDown,
  isEnabledHostedCheckoutProvider,
  isHostedCheckoutProvider,
  isMockCheckoutProvider,
} from "@/features/payments/lib/provider-checkout";
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
      providerId: string;
      providerName: string;
      checkoutUrl: string;
      providerPaymentRef: string;
      providerStatus: string;
      returnUrl: string;
      webhookUrl: string;
      checkoutMode: "internal_mock" | "hosted";
    }
  | { ok: false; message: string };

export type ProviderVerificationResult =
  | {
      ok: true;
      providerId: HostedCheckoutProviderId;
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

function buildMockCheckoutUrl(refId: string) {
  const path = `/dev/mock-checkout?ref=${encodeURIComponent(refId)}`;
  const appUrl = getAppUrl();
  return appUrl ? `${appUrl}${path}` : path;
}

function buildAppRouteUrl(path: string) {
  const appUrl = getAppUrl();
  if (!appUrl) {
    return null;
  }

  return `${appUrl}${path.startsWith("/") ? path : `/${path}`}`;
}

function normalizeKonnectPhone(phone: string | null) {
  if (!phone) {
    return undefined;
  }

  const digits = phone.replace(/\D/g, "");
  if (!digits) {
    return undefined;
  }

  if (digits.startsWith("216") && digits.length > 8) {
    return digits.slice(-8);
  }

  return digits.slice(-8);
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

function createMockCheckout(input: CreateCheckoutInput): CreateCheckoutResult {
  if (isCheckoutServiceDown(input.providerId)) {
    return { ok: false, message: `${input.providerName} is temporarily unavailable in this demo. Choose another linked route for now.` };
  }

  if (!isMockCheckoutProvider(input.providerId)) {
    return { ok: false, message: "This payment rail is not available in the internal mock checkout yet." };
  }

  const checkoutUrl = buildMockCheckoutUrl(input.refId);
  return {
    ok: true,
    providerId: input.providerId,
    providerName: input.providerName,
    checkoutUrl,
    providerPaymentRef: `MOCK_${input.refId}`,
    providerStatus: "DEVELOPMENT_MOCK_PENDING",
    returnUrl: checkoutUrl,
    webhookUrl: checkoutUrl,
    checkoutMode: "internal_mock",
  };
}

async function createKonnectCheckout(input: CreateCheckoutInput): Promise<CreateCheckoutResult> {
  const apiKey = serverEnv.KONNECT_API_KEY;
  const receiverWalletId = serverEnv.KONNECT_RECEIVER_WALLET_ID;
  if (!apiKey || !receiverWalletId) {
    return { ok: false, message: "Konnect sandbox keys are not configured yet for this demo." };
  }

  const webhookUrl = buildAppRouteUrl(`/api/payments/providers/konnect/webhook?ref=${encodeURIComponent(input.refId)}`);
  const returnUrl = buildAppRouteUrl(`/payments/return/konnect?ref=${encodeURIComponent(input.refId)}`);
  if (!webhookUrl || !returnUrl) {
    return { ok: false, message: "Set NEXT_PUBLIC_APP_URL before using the Konnect sandbox checkout." };
  }

  type KonnectInitPaymentResponse = {
    payUrl?: string;
    paymentRef?: string;
  };
  const normalizedPhone = normalizeKonnectPhone(input.payerPhone);

  const payload = await readJson<KonnectInitPaymentResponse>(
    `${serverEnv.KONNECT_API_BASE_URL ?? DEFAULT_KONNECT_BASE_URL}/payments/init-payment`,
    {
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
        description: `Mou3amla route ${input.recipientHandle} ref ${input.refId}`,
        acceptedPaymentMethods: ["wallet", "bank_card", "e-DINAR"],
        orderId: input.refId,
        webhook: webhookUrl,
        checkoutForm: true,
        theme: "light",
        ...(normalizedPhone ? { phoneNumber: normalizedPhone } : {}),
      }),
    },
  );

  if (!payload.payUrl || !payload.paymentRef) {
    logger.warn("Konnect init-payment response missing checkout fields", {
      ref_id: input.refId,
      provider_name: input.providerName,
      response_body: payload,
    });
    return { ok: false, message: "Konnect didn't return a usable sandbox checkout link." };
  }

  return {
    ok: true,
    providerId: input.providerId,
    providerName: input.providerName,
    checkoutUrl: payload.payUrl,
    providerPaymentRef: payload.paymentRef,
    providerStatus: "pending",
    returnUrl,
    webhookUrl,
    checkoutMode: "hosted",
  };
}

async function createFlouciCheckout(input: CreateCheckoutInput): Promise<CreateCheckoutResult> {
  const publicKey = serverEnv.FLOUCI_PUBLIC_KEY;
  const privateKey = serverEnv.FLOUCI_PRIVATE_KEY;
  if (!publicKey || !privateKey) {
    return { ok: false, message: "Flouci sandbox keys are not configured yet for this demo." };
  }

  // Both success_link and fail_link point at the same return page - it
  // re-verifies with Flouci's API and decides confirmed/failed itself,
  // never trusting which link the browser landed on (same pattern as
  // Konnect). Flouci appends its own `?payment_id=` on redirect; our page
  // resolves by `ref`, so the extra param is harmless.
  const returnUrl = buildAppRouteUrl(`/payments/return/flouci?ref=${encodeURIComponent(input.refId)}`);
  const webhookUrl = buildAppRouteUrl(`/api/payments/providers/flouci/webhook?ref=${encodeURIComponent(input.refId)}`);
  if (!returnUrl || !webhookUrl) {
    return { ok: false, message: "Set NEXT_PUBLIC_APP_URL before using the Flouci sandbox checkout." };
  }

  type FlouciGeneratePaymentResponse = {
    result?: {
      success?: boolean;
      payment_id?: string;
      link?: string;
    };
  };

  const payload = await readJson<FlouciGeneratePaymentResponse>(
    `${serverEnv.FLOUCI_API_BASE_URL ?? DEFAULT_FLOUCI_BASE_URL}/generate_payment`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${publicKey}:${privateKey}`,
      },
      body: JSON.stringify({
        // Flouci expects the amount as a string, in millimes.
        amount: String(Math.round(input.amount * 1000)),
        success_link: returnUrl,
        fail_link: returnUrl,
        webhook: webhookUrl,
        developer_tracking_id: input.refId,
        session_timeout_secs: 1200,
        accept_card: true,
      }),
    },
  );

  if (!payload.result?.link || !payload.result?.payment_id) {
    logger.warn("Flouci generate_payment response missing checkout fields", {
      ref_id: input.refId,
      provider_name: input.providerName,
      response_body: payload,
    });
    return { ok: false, message: "Flouci didn't return a usable sandbox checkout link." };
  }

  return {
    ok: true,
    providerId: input.providerId,
    providerName: input.providerName,
    checkoutUrl: payload.result.link,
    providerPaymentRef: payload.result.payment_id,
    providerStatus: "PENDING",
    returnUrl,
    webhookUrl,
    checkoutMode: "hosted",
  };
}

export async function createProviderCheckout(input: CreateCheckoutInput): Promise<CreateCheckoutResult> {
  if (isCheckoutServiceDown(input.providerId)) {
    return { ok: false, message: `${input.providerName} is temporarily unavailable in this demo. Choose another linked route for now.` };
  }

  if (isMockCheckoutProvider(input.providerId)) {
    return createMockCheckout(input);
  }

  if (input.providerId === "konnect" && isEnabledHostedCheckoutProvider(input.providerId)) {
    return createKonnectCheckout(input);
  }

  if (input.providerId === "flouci" && isEnabledHostedCheckoutProvider(input.providerId)) {
    return createFlouciCheckout(input);
  }

  if (!canLaunchProviderCheckout(input.providerId)) {
    return { ok: false, message: "This payment rail is not wired to a supported checkout flow yet." };
  }

  return { ok: false, message: "This payment rail is not available right now." };
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
  const hasAttemptedTransaction = (payload.payment?.transactions?.length ?? 0) > 0;
  const resolvedStatus =
    providerStatus === "completed" && transactionSucceeded
      ? "confirmed"
      : providerStatus === "pending" && hasAttemptedTransaction
        ? "failed"
        : "initiated";

  return {
    ok: true,
    providerId: "konnect",
    providerStatus,
    resolvedStatus,
    providerPaymentRef,
    failureReason: resolvedStatus === "failed" ? providerStatus : undefined,
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

  // Flouci status vocabulary: SUCCESS | PENDING | EXPIRED | FAILURE |
  // PREAUTH_SUCCESS | SYSTEM_FAILURE (see docs.flouci.com verify-transaction).
  const providerStatus = payload.result?.status?.toUpperCase() ?? "PENDING";
  const resolvedStatus =
    providerStatus === "SUCCESS" || providerStatus === "PREAUTH_SUCCESS"
      ? "confirmed"
      : providerStatus === "FAILURE" || providerStatus === "EXPIRED" || providerStatus === "SYSTEM_FAILURE"
        ? "failed"
        : "initiated";

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
  if (!isHostedCheckoutProvider(providerId)) {
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
