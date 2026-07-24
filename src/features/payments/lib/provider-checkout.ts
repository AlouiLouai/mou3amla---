import { canUseHostedCheckout, canUseMockCheckout, isProviderServiceDown } from "@/features/wallets/constants";
import type { HostedCheckoutProviderId } from "@/features/payments/types";

const HOSTED_CHECKOUT_PROVIDERS = new Set<HostedCheckoutProviderId>(["flouci", "konnect"]);

export function isHostedCheckoutProvider(providerId: string): providerId is HostedCheckoutProviderId {
  return HOSTED_CHECKOUT_PROVIDERS.has(providerId as HostedCheckoutProviderId);
}

export function isMockCheckoutProvider(providerId: string) {
  return canUseMockCheckout(providerId);
}

export function isEnabledHostedCheckoutProvider(providerId: string): providerId is HostedCheckoutProviderId {
  return isHostedCheckoutProvider(providerId) && canUseHostedCheckout(providerId);
}

export function canLaunchProviderCheckout(providerId: string) {
  return isMockCheckoutProvider(providerId) || isEnabledHostedCheckoutProvider(providerId);
}

export function isCheckoutServiceDown(providerId: string) {
  return isProviderServiceDown(providerId);
}
