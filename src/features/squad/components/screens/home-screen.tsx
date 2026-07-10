import { ChevronRight, IdCard, Loader2, Settings, X } from "lucide-react";
import { alpha, squad } from "@/features/squad/constants";
import type { UseSquadApp } from "@/features/squad/hooks/use-squad-app";
import { BottomNav } from "@/features/squad/components/bottom-nav";

export function HomeScreen({ squadApp }: { squadApp: UseSquadApp }) {
  const { state, derived, actions } = squadApp;

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex-1 overflow-auto px-5 pt-[max(1.25rem,env(safe-area-inset-top))] pb-2.5">
        <div className="mb-[22px] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className="flex size-[42px] items-center justify-center rounded-full border text-sm font-bold"
              style={{ background: squad.cardAlt, borderColor: "rgba(255,255,255,0.1)", color: squad.green }}
            >
              YT
            </div>
            <div>
              <div className="text-[15px] font-bold">Bonjour, Youssef</div>
              <div
                className="text-[11px] font-semibold"
                style={{ color: state.verified ? squad.green : squad.purple }}
              >
                {state.verified ? "✓ Verified" : "Unverified"}
              </div>
            </div>
          </div>
          <button
            type="button"
            className="flex size-[38px] items-center justify-center rounded-full border"
            style={{ background: squad.card, borderColor: "rgba(255,255,255,0.08)" }}
          >
            <Settings className="size-4" style={{ color: "rgba(244,245,246,0.6)" }} />
          </button>
        </div>

        {!state.verified && (
          <div
            className="mb-5 flex items-center gap-3 rounded-2xl border p-4"
            style={{ background: alpha(squad.purple, 0.1), borderColor: alpha(squad.purple, 0.35) }}
          >
            <div
              className="flex size-9 shrink-0 items-center justify-center rounded-[10px]"
              style={{ background: alpha(squad.purple, 0.18) }}
            >
              <IdCard className="size-4.5" style={{ color: squad.purple }} />
            </div>
            <div className="flex-1">
              <div className="mb-0.5 text-[13px] font-bold">Verify your identity</div>
              <div className="text-[11.5px] leading-tight" style={{ color: "rgba(244,245,246,0.55)" }}>
                Unlock Sonic transfers with a quick KYC check.
              </div>
            </div>
            <button
              type="button"
              onClick={actions.startKyc}
              className="shrink-0 rounded-[9px] px-3.5 py-2 text-xs font-bold whitespace-nowrap"
              style={{ background: squad.purple, color: "#0A0018" }}
            >
              Verify
            </button>
          </div>
        )}

        <div
          className="mb-[22px] rounded-[18px] border p-5"
          style={{
            background: "linear-gradient(135deg, #14231C, #0F1613)",
            borderColor: alpha(squad.green, 0.25),
          }}
        >
          <div className="mb-2 text-[11px] font-semibold tracking-wide" style={{ color: "rgba(244,245,246,0.5)" }}>
            TOTAL BALANCE
          </div>
          <div className="font-mono text-[32px] font-semibold">
            {derived.totalBalanceStr} <span className="text-base" style={{ color: squad.green }}>DT</span>
          </div>
          <div className="mt-1 text-[11.5px]" style={{ color: "rgba(244,245,246,0.4)" }}>
            Across {state.wallets.length} linked wallets
          </div>
        </div>

        <div className="mb-3 flex items-center justify-between">
          <div className="text-[13px] font-bold tracking-wide">Your Wallets</div>
          <button type="button" onClick={actions.openLink} className="text-xs font-bold" style={{ color: squad.green }}>
            + Link Account
          </button>
        </div>

        <div className="mb-4 flex flex-col gap-3">
          {state.wallets.map((wallet) => (
            <div
              key={wallet.id}
              className="animate-[squad-fadeup_0.4s_ease_both] overflow-hidden rounded-[14px] border border-l-[3px] p-4"
              style={{ background: squad.card, borderColor: "rgba(255,255,255,0.09)", borderLeftColor: wallet.color }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div
                    className="flex size-8 items-center justify-center rounded-[9px] text-[11px] font-extrabold"
                    style={{ background: alpha(wallet.color, 0.14), color: wallet.color }}
                  >
                    {wallet.initials}
                  </div>
                  <div>
                    <div className="text-[13.5px] font-bold">{wallet.name}</div>
                    <div className="font-mono text-[11px]" style={{ color: "rgba(244,245,246,0.4)" }}>
                      {wallet.tag}
                    </div>
                  </div>
                </div>
                <div
                  className="text-[9.5px] font-bold tracking-wide uppercase"
                  style={{ color: "rgba(244,245,246,0.35)" }}
                >
                  {wallet.network}
                </div>
              </div>
              <div className="mt-3.5 font-mono text-[22px] font-semibold">
                {wallet.balance.toFixed(3)}{" "}
                <span className="text-xs" style={{ color: "rgba(244,245,246,0.4)" }}>
                  DT
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <BottomNav active="home" onHome={actions.goHome} onSend={actions.goSend} onActivity={actions.goActivity} onProfile={actions.goProfile} />

      {state.linkOpen && (
        <>
          <button
            type="button"
            aria-label="Close"
            onClick={actions.closeLink}
            className="fixed inset-0 z-40"
            style={{ background: "rgba(0,0,0,0.6)" }}
          />
          <div
            className="animate-[squad-fadeup_0.25s_ease_both] fixed inset-x-0 bottom-0 z-50 mx-auto max-w-md rounded-t-[22px] border border-b-0 px-5 pt-4.5 pb-[max(1.75rem,env(safe-area-inset-bottom))]"
            style={{ background: squad.card, borderColor: "rgba(255,255,255,0.1)" }}
          >
            <div className="mx-auto mb-4 h-1 w-9 rounded-full" style={{ background: "rgba(255,255,255,0.2)" }} />
            <div className="mb-4 flex items-center justify-between">
              <div className="text-[15px] font-bold">Link an Account</div>
              <button
                type="button"
                onClick={actions.closeLink}
                className="flex size-[26px] items-center justify-center rounded-full"
                style={{ background: squad.cardAlt, color: "rgba(244,245,246,0.6)" }}
              >
                <X className="size-3.5" />
              </button>
            </div>
            <div className="flex flex-col gap-2">
              {derived.availableProviders.map((provider) => {
                const connecting = state.linkConnectingId === provider.id;
                return (
                  <button
                    key={provider.id}
                    type="button"
                    onClick={() => actions.connectProvider(provider.id)}
                    className="flex items-center gap-3 rounded-xl border p-3.5 text-left"
                    style={{ background: squad.cardAlt, borderColor: "rgba(255,255,255,0.07)" }}
                  >
                    <div
                      className="flex size-[34px] shrink-0 items-center justify-center rounded-[9px] text-[11px] font-extrabold"
                      style={{ background: alpha(provider.color, 0.14), color: provider.color }}
                    >
                      {provider.initials}
                    </div>
                    <div className="flex-1">
                      <div className="text-[13px] font-bold">{provider.name}</div>
                      <div className="text-[11px]" style={{ color: "rgba(244,245,246,0.45)" }}>
                        {provider.subtitle}
                      </div>
                    </div>
                    {connecting ? (
                      <Loader2 className="size-4 animate-spin" style={{ color: squad.green }} />
                    ) : (
                      <ChevronRight className="size-4" style={{ color: "rgba(244,245,246,0.3)" }} />
                    )}
                  </button>
                );
              })}
              {derived.availableProviders.length === 0 && (
                <div className="p-5 text-center text-[12.5px]" style={{ color: "rgba(244,245,246,0.4)" }}>
                  All available networks are linked.
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
