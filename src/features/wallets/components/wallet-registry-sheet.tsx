import { ChevronLeft, ChevronRight, Loader2, X } from "lucide-react";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { alpha, mou3amla } from "@/features/mou3amla/constants";
import type { UseMou3amlaApp } from "@/features/mou3amla/hooks/use-mou3amla-app";
import { canUseHostedCheckout, isProviderPendingApproval, isProviderServiceDown } from "@/features/wallets/constants";
import { WalletIcon } from "@/features/wallets/components/wallet-icon";

const ROUTING_LABELS = {
  wallet_tag: { label: "Wallet Tag", placeholder: "@yourname" },
  merchant_id: { label: "Merchant ID", placeholder: "MERCH-00123" },
  rib: { label: "RIB (20 digits)", placeholder: "12345678901234567890" },
} as const;

/**
 * Two-step sheet: pick a provider, then enter only its public routing
 * identifier (wallet tag / merchant id / RIB). Never ask for a balance,
 * PIN, or password because Mou3amla is destination-only.
 */
export function WalletRegistrySheet({ mou3amlaApp }: { mou3amlaApp: UseMou3amlaApp }) {
  const { state, derived, actions } = mou3amlaApp;
  const account = derived.account;

  return (
    <BottomSheet open={state.linkOpen} onClose={actions.closeLink}>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {state.linkStep === "identifier" ? (
            <button
              type="button"
              onClick={actions.backToProviderPick}
              aria-label="Back"
              className="flex size-7 items-center justify-center rounded-full"
              style={{ background: mou3amla.cardAlt }}
            >
              <ChevronLeft className="size-4" />
            </button>
          ) : null}
          <div className="text-[15px] font-bold">{state.linkStep === "provider" ? "Link an Account" : derived.linkProvider?.name}</div>
        </div>
        <button
          type="button"
          onClick={actions.closeLink}
          className="flex size-[26px] items-center justify-center rounded-full"
          style={{ background: mou3amla.cardAlt, color: mou3amla.textMuted }}
        >
          <X className="size-3.5" />
        </button>
      </div>

      <div className="max-h-[65vh] overflow-auto">
        {state.linkStep === "provider" ? (
          <div className="flex flex-col gap-2">
            {account.profile.verificationStatus !== "verified" ? (
              <div
                className="mb-1 rounded-2xl border px-4 py-3 text-[11.5px] leading-relaxed"
                style={{
                  background: alpha(mou3amla.subtle, 0.1),
                  borderColor: alpha(mou3amla.subtle, 0.3),
                  color: mou3amla.textMuted,
                }}
              >
                Complete identity verification before linking a wallet or bank account.
              </div>
            ) : null}
            {derived.availableProviders.map((provider) => {
              const serviceDown = isProviderServiceDown(provider.id);
              const pendingApproval = isProviderPendingApproval(provider.id);
              const hostedCheckout = canUseHostedCheckout(provider.id);
              const disabled = account.profile.verificationStatus !== "verified" || serviceDown;

              return (
                <button
                  key={provider.id}
                  type="button"
                  onClick={() => actions.selectLinkProvider(provider.id)}
                  disabled={disabled}
                  className="flex items-center gap-3 rounded-2xl border p-3.5 text-left transition-transform active:scale-[0.98] disabled:active:scale-100"
                  style={{
                    background: mou3amla.cardAlt,
                    borderColor: serviceDown ? alpha(mou3amla.destructive, 0.35) : mou3amla.border,
                    opacity: disabled ? 0.6 : 1,
                  }}
                >
                  <div
                    className="flex size-[38px] shrink-0 items-center justify-center rounded-[12px] text-[11px] font-extrabold"
                    style={{ background: alpha(provider.color, 0.16), color: provider.color }}
                  >
                    <WalletIcon id={provider.id} initials={provider.initials} className="size-4.5" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <div className="text-[13px] font-bold">{provider.name}</div>
                      <span
                        className="rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.14em]"
                        style={{
                          background: serviceDown ? alpha(mou3amla.destructive, 0.14) : alpha(mou3amla.accent, 0.12),
                          color: serviceDown ? mou3amla.destructive : mou3amla.accent,
                        }}
                      >
                        {pendingApproval ? "waiting for approval" : serviceDown ? "down for the moment" : hostedCheckout ? "hosted checkout" : "mock checkout"}
                      </span>
                    </div>
                    <div className="text-[11px]" style={{ color: serviceDown ? mou3amla.destructive : mou3amla.textMuted }}>
                      {pendingApproval
                        ? `${provider.subtitle}. Sandbox onboarding opens once the business registration (RNE) step is approved.`
                        : serviceDown
                          ? `${provider.subtitle}. Keep this disabled in demos to avoid a broken third-party handoff.`
                          : hostedCheckout
                            ? `${provider.subtitle}. Linked routes open ${provider.name}'s real sandbox checkout for demos.`
                            : `${provider.subtitle}. Linked routes use Mou3amla's internal development checkout for demos.`}
                    </div>
                  </div>
                  <ChevronRight className="size-4" style={{ color: mou3amla.textFaint }} />
                </button>
              );
            })}
            {derived.availableProviders.length === 0 ? (
              <div className="p-5 text-center text-[12.5px]" style={{ color: mou3amla.textMuted }}>
                All available providers are already linked.
              </div>
            ) : null}
          </div>
        ) : derived.linkProvider ? (
          <div>
            {(() => {
              const routingType = derived.linkProvider.acceptedRoutingTypes[0];
              const { label, placeholder: defaultPlaceholder } = ROUTING_LABELS[routingType];
              const placeholder = derived.linkProvider.routingPlaceholder ?? defaultPlaceholder;
              const connecting = state.linkConnectingId === derived.linkProvider.id;

              return (
                <>
                  {account.profile.verificationStatus !== "verified" ? (
                    <div
                      className="mb-4 rounded-2xl border px-4 py-3 text-[11.5px] leading-relaxed"
                      style={{
                        background: alpha(mou3amla.subtle, 0.1),
                        borderColor: alpha(mou3amla.subtle, 0.3),
                        color: mou3amla.textMuted,
                      }}
                    >
                      Complete identity verification before linking a wallet or bank account.
                    </div>
                  ) : null}
                  <div className="mb-2 text-xs font-semibold tracking-wide" style={{ color: mou3amla.textMuted }}>
                    {label.toUpperCase()}
                  </div>
                  <p className="mb-3 text-[11.5px] leading-relaxed" style={{ color: mou3amla.textMuted }}>
                    Enter only the public route value. Mou3amla never asks for a PIN, password, or balance.
                  </p>
                  <div
                    className="mb-4 flex items-center rounded-2xl border px-4 py-3"
                    style={{ background: mou3amla.cardAlt, borderColor: mou3amla.borderStrong }}
                  >
                    <input
                      autoFocus
                      value={state.linkIdentifierInput}
                      onChange={(e) => actions.onLinkIdentifierChange(e.target.value)}
                      placeholder={placeholder}
                      inputMode={routingType === "rib" ? "numeric" : "text"}
                      className="flex-1 border-none bg-transparent font-mono text-[15px] outline-none"
                      style={{ color: mou3amla.text }}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={actions.confirmLinkWallet}
                    disabled={connecting || account.profile.verificationStatus !== "verified"}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-[15px] font-bold transition-opacity disabled:opacity-70"
                    style={{ background: mou3amla.accent, color: "#FFFFFF" }}
                  >
                    {connecting ? <Loader2 className="size-4 animate-spin" /> : null}
                    {connecting ? "Linking..." : "Link Account"}
                  </button>
                </>
              );
            })()}
          </div>
        ) : null}
      </div>
    </BottomSheet>
  );
}
