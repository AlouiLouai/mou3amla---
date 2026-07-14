import { ChevronLeft, ChevronRight, Loader2, X } from "lucide-react";
import { alpha, raisedShadow, squad } from "@/features/squad/constants";
import type { UseSquadApp } from "@/features/squad/hooks/use-squad-app";
import { WalletIcon } from "@/features/wallets/components/wallet-icon";

const ROUTING_LABELS = {
  wallet_tag: { label: "Wallet Tag", placeholder: "@yourname" },
  merchant_id: { label: "Merchant ID", placeholder: "MERCH-00123" },
  rib: { label: "RIB (20 digits)", placeholder: "12345678901234567890" },
} as const;

/**
 * Two-step sheet: pick a provider, then enter only its public routing
 * identifier (wallet tag / merchant id / RIB). Never ask for a balance,
 * PIN, or password because SQUAD is destination-only.
 */
export function WalletRegistrySheet({ squadApp }: { squadApp: UseSquadApp }) {
  const { state, derived, actions } = squadApp;
  const account = derived.account;

  if (!state.linkOpen) return null;

  return (
    <>
      <button
        type="button"
        aria-label="Close"
        onClick={actions.closeLink}
        className="fixed inset-0 z-40 backdrop-blur-sm"
        style={{ background: "rgba(5,6,8,0.65)" }}
      />
      <div
        className="animate-[squad-fadeup_0.25s_ease_both] fixed inset-x-0 bottom-0 z-50 mx-auto max-h-[80vh] max-w-md overflow-auto rounded-t-[28px] border border-b-0 px-5 pt-4.5 pb-[max(1.75rem,env(safe-area-inset-bottom))]"
        style={{ background: squad.card, borderColor: squad.borderStrong, boxShadow: raisedShadow }}
      >
        <div className="mx-auto mb-4 h-1 w-9 rounded-full" style={{ background: alpha(squad.accent, 0.18) }} />
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {state.linkStep === "identifier" ? (
              <button
                type="button"
                onClick={actions.backToProviderPick}
                aria-label="Back"
                className="flex size-7 items-center justify-center rounded-full"
                style={{ background: squad.cardAlt }}
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
            style={{ background: squad.cardAlt, color: squad.textMuted }}
          >
            <X className="size-3.5" />
          </button>
        </div>

        {state.linkStep === "provider" ? (
          <div className="flex flex-col gap-2">
            {derived.availableProviders.map((provider) => (
              <button
                key={provider.id}
                type="button"
                onClick={() => actions.selectLinkProvider(provider.id)}
                className="flex items-center gap-3 rounded-2xl border p-3.5 text-left transition-transform active:scale-[0.98]"
                style={{
                  background: squad.cardAlt,
                  borderColor: squad.border,
                  opacity:
                    provider.acceptedRoutingTypes[0] === "rib" && account.profile.verificationStatus !== "verified"
                      ? 0.55
                      : 1,
                }}
              >
                <div
                  className="flex size-[38px] shrink-0 items-center justify-center rounded-[12px] text-[11px] font-extrabold"
                  style={{ background: alpha(provider.color, 0.16), color: provider.color }}
                >
                  <WalletIcon id={provider.id} initials={provider.initials} className="size-4.5" />
                </div>
                <div className="flex-1">
                  <div className="text-[13px] font-bold">{provider.name}</div>
                  <div className="text-[11px]" style={{ color: squad.textMuted }}>
                    {provider.subtitle}
                  </div>
                  {provider.acceptedRoutingTypes[0] === "rib" && account.profile.verificationStatus !== "verified" ? (
                    <div className="mt-1 text-[10.5px] font-semibold" style={{ color: squad.subtle }}>
                      Unlocks after identity verification
                    </div>
                  ) : null}
                </div>
                <ChevronRight className="size-4" style={{ color: squad.textFaint }} />
              </button>
            ))}
            {derived.availableProviders.length === 0 ? (
              <div className="p-5 text-center text-[12.5px]" style={{ color: squad.textMuted }}>
                All available providers are already linked.
              </div>
            ) : null}
          </div>
        ) : derived.linkProvider ? (
          <div>
            {(() => {
              const routingType = derived.linkProvider.acceptedRoutingTypes[0];
              const { label, placeholder } = ROUTING_LABELS[routingType];
              const connecting = state.linkConnectingId === derived.linkProvider.id;

              return (
                <>
                  {routingType === "rib" && account.profile.verificationStatus !== "verified" ? (
                    <div
                      className="mb-4 rounded-2xl border px-4 py-3 text-[11.5px] leading-relaxed"
                      style={{
                        background: alpha(squad.subtle, 0.1),
                        borderColor: alpha(squad.subtle, 0.3),
                        color: squad.textMuted,
                      }}
                    >
                      Complete identity verification before entering a 20-digit bank RIB.
                    </div>
                  ) : null}
                  <div className="mb-2 text-xs font-semibold tracking-wide" style={{ color: squad.textMuted }}>
                    {label.toUpperCase()}
                  </div>
                  <p className="mb-3 text-[11.5px] leading-relaxed" style={{ color: squad.textMuted }}>
                    Enter only the public route value. SQUAD never asks for a PIN, password, or balance.
                  </p>
                  <div
                    className="mb-4 flex items-center rounded-2xl border px-4 py-3"
                    style={{ background: squad.cardAlt, borderColor: squad.borderStrong }}
                  >
                    <input
                      autoFocus
                      value={state.linkIdentifierInput}
                      onChange={(e) => actions.onLinkIdentifierChange(e.target.value)}
                      placeholder={placeholder}
                      inputMode={routingType === "rib" ? "numeric" : "text"}
                      className="flex-1 border-none bg-transparent font-mono text-[15px] outline-none"
                      style={{ color: squad.text }}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={actions.confirmLinkWallet}
                    disabled={connecting}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-[15px] font-bold transition-opacity disabled:opacity-70"
                    style={{ background: squad.accent, color: "#FFFFFF" }}
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
    </>
  );
}
