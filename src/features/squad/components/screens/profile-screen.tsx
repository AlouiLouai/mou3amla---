import { ChevronRight, LogOut, ScanFace, ShieldCheck, Wallet as WalletIcon } from "lucide-react";
import { alpha, squad } from "@/features/squad/constants";
import type { UseSquadApp } from "@/features/squad/hooks/use-squad-app";
import { BottomNav } from "@/features/squad/components/bottom-nav";

export function ProfileScreen({ squadApp }: { squadApp: UseSquadApp }) {
  const { state, derived, actions } = squadApp;

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex-1 overflow-auto p-5 pt-[max(1.25rem,env(safe-area-inset-top))]">
        <div className="mb-5 text-xl font-extrabold">Profile</div>

        <div className="mb-6 flex flex-col items-center text-center">
          <div
            className="mb-3 flex size-[74px] items-center justify-center rounded-full border text-[22px] font-bold"
            style={{ background: squad.cardAlt, borderColor: "rgba(255,255,255,0.1)", color: squad.green }}
          >
            YT
          </div>
          <div className="text-base font-bold">Youssef Trabelsi</div>
          <div className="mb-2 font-mono text-[12.5px]" style={{ color: "rgba(244,245,246,0.45)" }}>
            +216 20 123 456
          </div>
          <div
            className="rounded-full px-3 py-1 text-[11px] font-bold"
            style={{
              background: alpha(state.verified ? squad.green : squad.purple, 0.14),
              color: state.verified ? squad.green : squad.purple,
            }}
          >
            {state.verified ? "✓ Verified" : "Unverified"}
          </div>
        </div>

        <div className="mb-[22px] flex gap-2.5">
          <div className="flex-1 rounded-2xl border p-3.5 text-center" style={{ background: squad.card, borderColor: "rgba(255,255,255,0.08)" }}>
            <div className="font-mono text-lg font-bold">{state.wallets.length}</div>
            <div className="mt-0.5 text-[10.5px]" style={{ color: "rgba(244,245,246,0.45)" }}>
              Wallets Linked
            </div>
          </div>
          <div className="flex-1 rounded-2xl border p-3.5 text-center" style={{ background: squad.card, borderColor: "rgba(255,255,255,0.08)" }}>
            <div className="font-mono text-lg font-bold">{derived.totalBalanceStr}</div>
            <div className="mt-0.5 text-[10.5px]" style={{ color: "rgba(244,245,246,0.45)" }}>
              Total DT
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          {!state.verified && (
            <button
              type="button"
              onClick={actions.startKyc}
              className="flex items-center justify-between rounded-xl border px-4 py-3.5 text-left"
              style={{ background: squad.card, borderColor: "rgba(255,255,255,0.08)" }}
            >
              <span className="flex items-center gap-2.5 text-[13.5px] font-semibold">
                <ShieldCheck className="size-4" style={{ color: "rgba(244,245,246,0.6)" }} />
                Identity Verification
              </span>
              <span className="flex items-center gap-1 text-xs font-bold" style={{ color: squad.purple }}>
                Verify <ChevronRight className="size-3.5" />
              </span>
            </button>
          )}
          <div
            className="flex items-center justify-between rounded-xl border px-4 py-3.5"
            style={{ background: squad.card, borderColor: "rgba(255,255,255,0.08)" }}
          >
            <span className="flex items-center gap-2.5 text-[13.5px] font-semibold">
              <WalletIcon className="size-4" style={{ color: "rgba(244,245,246,0.6)" }} />
              Linked Accounts
            </span>
            <span className="text-xs" style={{ color: "rgba(244,245,246,0.4)" }}>
              {state.wallets.length} active
            </span>
          </div>
          <div
            className="flex items-center justify-between rounded-xl border px-4 py-3.5"
            style={{ background: squad.card, borderColor: "rgba(255,255,255,0.08)" }}
          >
            <span className="flex items-center gap-2.5 text-[13.5px] font-semibold">
              <ScanFace className="size-4" style={{ color: "rgba(244,245,246,0.6)" }} />
              Security
            </span>
            <span className="text-xs" style={{ color: "rgba(244,245,246,0.4)" }}>
              Face ID enabled
            </span>
          </div>
          <button
            type="button"
            onClick={actions.logout}
            className="mt-2 flex items-center justify-between rounded-xl border px-4 py-3.5 text-left"
            style={{ background: squad.card, borderColor: alpha(squad.red, 0.25) }}
          >
            <span className="flex items-center gap-2.5 text-[13.5px] font-semibold" style={{ color: squad.red }}>
              <LogOut className="size-4" />
              Log Out
            </span>
          </button>
        </div>
      </div>
      <BottomNav
        active="profile"
        onHome={actions.goHome}
        onSend={actions.goSend}
        onActivity={actions.goActivity}
        onProfile={actions.goProfile}
      />
    </div>
  );
}
