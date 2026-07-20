import "server-only";

import { serverEnv } from "@/config/env.server";
import type { HostedCheckoutProviderId } from "@/features/payments/types";
import { isCheckoutServiceDown, isHostedCheckoutProvider, isMockCheckoutProvider } from "@/features/payments/lib/provider-checkout";
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
  };
}

export async function createProviderCheckout(input: CreateCheckoutInput): Promise<CreateCheckoutResult> {
  return createMockCheckout(input);
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
