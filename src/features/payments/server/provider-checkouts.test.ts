import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/config/env.server", () => ({
  serverEnv: {
    NEXT_PUBLIC_APP_URL: "https://mou3amla.vercel.app",
    NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "publishable-key",
    NODE_ENV: "test",
    SUPABASE_SERVICE_ROLE_KEY: "service-role-key",
    QR_TOKEN_SECRET: "12345678901234567890123456789012",
    KONNECT_API_KEY: "konnect-key",
    KONNECT_RECEIVER_WALLET_ID: "wallet_123",
    KONNECT_API_BASE_URL: "https://api.sandbox.konnect.network/api/v2",
    FLOUCI_PUBLIC_KEY: undefined,
    FLOUCI_PRIVATE_KEY: undefined,
    FLOUCI_API_BASE_URL: undefined,
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

const { createProviderCheckout, verifyProviderPayment } = await import("@/features/payments/server/provider-checkouts");

describe("provider-checkouts", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // Konnect's demoCheckoutStatus is "service_down" in wallets/constants.ts
  // (see docs/09-bct-sandbox-readiness.md) - createProviderCheckout short-
  // circuits on that before ever reaching the real init-payment call below,
  // so no send flow can redirect to a live Konnect gateway URL today. The
  // hosted-checkout integration itself stays in place, dormant, for when
  // it's re-enabled; verifyKonnectPayment's own tests below cover that it
  // still parses real Konnect API responses correctly.
  it("refuses a Konnect checkout while the provider is marked service_down", async () => {
    const result = await createProviderCheckout({
      providerId: "konnect",
      providerName: "Konnect",
      refId: "ref_123",
      amount: 25,
      payerPhone: "+216 20 123 456",
      recipientHandle: "@receiver",
    });

    expect(result).toEqual({
      ok: false,
      message: "Konnect is temporarily unavailable in this demo. Choose another linked route for now.",
    });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("keeps the existing internal mock checkout behavior for non-hosted rails", async () => {
    const result = await createProviderCheckout({
      providerId: "biat",
      providerName: "BIAT",
      refId: "ref_mock",
      amount: 10,
      payerPhone: "+21620123456",
      recipientHandle: "@receiver",
    });

    expect(result).toEqual({
      ok: true,
      providerId: "biat",
      providerName: "BIAT",
      checkoutUrl: "https://mou3amla.vercel.app/dev/mock-checkout?ref=ref_mock",
      providerPaymentRef: "MOCK_ref_mock",
      providerStatus: "DEVELOPMENT_MOCK_PENDING",
      returnUrl: "https://mou3amla.vercel.app/dev/mock-checkout?ref=ref_mock",
      webhookUrl: "https://mou3amla.vercel.app/dev/mock-checkout?ref=ref_mock",
      checkoutMode: "internal_mock",
    });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("marks a completed Konnect payment as confirmed", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(
        JSON.stringify({
          payment: {
            status: "completed",
            transactions: [{ status: "success" }],
          },
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );

    const result = await verifyProviderPayment("konnect", { provider_payment_ref: "pay_123" });

    expect(result).toEqual({
      ok: true,
      providerId: "konnect",
      providerStatus: "completed",
      resolvedStatus: "confirmed",
      providerPaymentRef: "pay_123",
    });
  });

  it("marks a Konnect payment as failed once a pending payment has attempted transactions without success", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(
        JSON.stringify({
          payment: {
            status: "pending",
            transactions: [{ status: "failed" }],
          },
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );

    const result = await verifyProviderPayment("konnect", { provider_payment_ref: "pay_456" });

    expect(result).toEqual({
      ok: true,
      providerId: "konnect",
      providerStatus: "pending",
      resolvedStatus: "failed",
      providerPaymentRef: "pay_456",
      failureReason: "pending",
    });
  });
});
