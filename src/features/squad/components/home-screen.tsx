import { ChevronDown, QrCode, ScanLine, Send, ShieldCheck } from "lucide-react";
import { alpha, cardShadow, squad } from "@/features/squad/constants";
import type { UseSquadApp } from "@/features/squad/hooks/use-squad-app";
import { BottomNav } from "@/features/squad/components/bottom-nav";
import { WalletIcon } from "@/features/wallets/components/wallet-icon";
import { WalletRegistrySheet } from "@/features/wallets/components/wallet-registry-sheet";

const ROUTING_LABELS = { wallet_tag: "Tag", merchant_id: "Merchant ID", rib: "RIB" } as const;

function maskRoutingValue(value: string): string {
  if (value.startsWith("@")) return value;
  if (value.length <= 4) return value;
  return `••${value.slice(-4)}`;
}

function timeGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Bonjour";
  if (hour < 18) return "Bon après-midi";
  return "Bonsoir";
}

export function HomeScreen({ squadApp }: { squadApp: UseSquadApp }) {
  const { derived, actions } = squadApp;
  const account = derived.account;
  const initials = account.profile.fullName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex-1 overflow-auto px-4 pt-[max(1.25rem,env(safe-area-inset-top))] pb-2.5">
        <button
          type="button"
          onClick={actions.openAccountSwitcher}
          className="mb-5 flex w-full items-center justify-between rounded-2xl p-1 pr-3 transition-colors active:bg-white/5"
        >
          <div className="flex items-center gap-2.5">
            <div
              className="flex size-9 items-center justify-center rounded-full text-[13px] font-bold"
              style={{ background: squad.accent, color: squad.bg }}
            >
              {initials || "SQ"}
            </div>
            <div className="text-left">
              <div className="text-[14px] font-bold tracking-tight">
                {timeGreeting()}, {account.profile.fullName.split(" ")[0] || "there"}
              </div>
              <div className="font-mono text-[10.5px]" style={{ color: squad.textMuted }}>
                @{account.profile.username}
                {account.profile.isProfessional ? " · Pro" : ""}
              </div>
            </div>
          </div>
          <ChevronDown className="size-4" style={{ color: squad.textFaint }} />
        </button>

        <div
          className="mb-4 flex items-start gap-2.5 rounded-2xl border p-3.5"
          style={{ background: squad.card, borderColor: alpha(squad.accent, 0.22) }}
        >
          <ShieldCheck className="mt-0.5 size-3.5 shrink-0" style={{ color: squad.accent }} />
          <p className="text-[11px] leading-relaxed" style={{ color: "rgba(245,246,248,0.75)" }}>
            SQUAD never holds your money — it routes payments straight to
            your own bank/wallet apps.
          </p>
        </div>

        <div className="mb-5 grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={actions.goGenerateIntent}
            className="flex flex-col items-center gap-1.5 rounded-2xl py-3 transition-transform active:scale-[0.97]"
            style={{ background: squad.accent, boxShadow: cardShadow }}
          >
            <Send className="size-4" style={{ color: squad.bg }} />
            <span className="text-[10.5px] font-bold" style={{ color: squad.bg }}>
              Pay
            </span>
          </button>
          <button
            type="button"
            onClick={actions.goReceiveQr}
            className="flex flex-col items-center gap-1.5 rounded-2xl border py-3 transition-transform active:scale-[0.97]"
            style={{ background: squad.card, borderColor: squad.border }}
          >
            <QrCode className="size-4" style={{ color: squad.text }} />
            <span className="text-[10.5px] font-bold">Request</span>
          </button>
          <button
            type="button"
            onClick={actions.goScanQr}
            className="flex flex-col items-center gap-1.5 rounded-2xl border py-3 transition-transform active:scale-[0.97]"
            style={{ background: squad.card, borderColor: squad.border }}
          >
            <ScanLine className="size-4" style={{ color: squad.text }} />
            <span className="text-[10.5px] font-bold">Scan</span>
          </button>
        </div>

        <div className="mb-2.5 flex items-center justify-between">
          <div className="text-[12.5px] font-bold tracking-wide">Linked Accounts</div>
          <button type="button" onClick={actions.openLink} className="text-[11.5px] font-bold" style={{ color: squad.accent }}>
            + Link Account
          </button>
        </div>

        <div className="mb-4 flex flex-col gap-2">
          {account.wallets.map((wallet) => {
            const isDefault = wallet.id === account.sourceWalletId;
            return (
              <button
                key={wallet.id}
                type="button"
                onClick={() => actions.selectSource(wallet.id)}
                className="animate-[squad-fadeup_0.4s_ease_both] overflow-hidden rounded-2xl border p-3 text-left transition-transform active:scale-[0.98]"
                style={{
                  background: isDefault ? alpha(wallet.color, 0.08) : squad.card,
                  borderColor: isDefault ? alpha(wallet.color, 0.4) : squad.border,
                  boxShadow: isDefault ? cardShadow : "none",
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="flex size-8 items-center justify-center rounded-[10px] text-[11px] font-extrabold"
                      style={{ background: alpha(wallet.color, 0.16), color: wallet.color }}
                    >
                      <WalletIcon id={wallet.providerId} initials={wallet.initials} className="size-4" />
                    </div>
                    <div>
                      <div className="text-[13px] font-bold">{wallet.name}</div>
                      <div className="font-mono text-[10.5px]" style={{ color: squad.textMuted }}>
                        {ROUTING_LABELS[wallet.routingType]} · {maskRoutingValue(wallet.routingValue)}
                      </div>
                    </div>
                  </div>
                  {isDefault && (
                    <span
                      className="rounded-full px-2 py-0.5 text-[9px] font-bold tracking-wide uppercase"
                      style={{ background: alpha(wallet.color, 0.18), color: wallet.color }}
                    >
                      Default
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <BottomNav active="home" onHome={actions.goHome} onSend={actions.goGenerateIntent} onActivity={actions.goActivity} onProfile={actions.goProfile} />

      <WalletRegistrySheet squadApp={squadApp} />
    </div>
  );
}
