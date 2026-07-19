import type { SupportedCheckoutProviderId } from "@/features/payments/types";

const SUPPORTED_CHECKOUT_PROVIDERS = new Set<SupportedCheckoutProviderId>(["flouci", "konnect"]);

export function isSupportedCheckoutProvider(providerId: string): providerId is SupportedCheckoutProviderId {
  return SUPPORTED_CHECKOUT_PROVIDERS.has(providerId as SupportedCheckoutProviderId);
}
