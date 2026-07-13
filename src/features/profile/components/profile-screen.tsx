import { ChevronRight, FileText, LogOut, Repeat, ShieldAlert, Wallet as WalletIcon } from "lucide-react";
import { alpha, squad } from "@/features/squad/constants";
import type { UseSquadApp } from "@/features/squad/hooks/use-squad-app";
import { BottomNav } from "@/features/squad/components/bottom-nav";

export function ProfileScreen({ squadApp }: { squadApp: UseSquadApp }) {
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
      <div className="flex-1 overflow-auto p-5 pt-[max(1.25rem,env(safe-area-inset-top))]">
        <div className="mb-4 text-xl font-extrabold tracking-tight">Profile</div>

        <div className="mb-5 flex flex-col items-center text-center">
          <div
            className="mb-2.5 flex size-16 items-center justify-center rounded-full border text-lg font-bold"
            style={{ background: squad.cardAlt, borderColor: squad.border, color: squad.accent }}
          >
            {initials || "SQ"}
          </div>
          <div className="text-[15px] font-bold">{account.profile.fullName || "SQUAD user"}</div>
          <div className="mb-2 font-mono text-[12px]" style={{ color: squad.textMuted }}>
            @{account.profile.username}
          </div>
          <div
            className="rounded-full px-2.5 py-1 text-[10.5px] font-bold"
            style={{
              background: alpha(account.profile.isProfessional ? squad.subtle : squad.accent, 0.16),
              color: account.profile.isProfessional ? squad.subtle : squad.accent,
            }}
          >
            {account.profile.isProfessional ? "Mode Professionnel" : "Personal account"}
          </div>
        </div>

        <button
          type="button"
          onClick={actions.openAccountSwitcher}
          className="mb-4 flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left"
          style={{ background: alpha(squad.subtle, 0.08), borderColor: alpha(squad.subtle, 0.25) }}
        >
          <span className="flex items-center gap-2.5 text-[13px] font-semibold" style={{ color: squad.subtle }}>
            <Repeat className="size-4" />
            Preview as another account (demo)
          </span>
          <ChevronRight className="size-3.5" style={{ color: squad.subtle }} />
        </button>

        {account.profile.isProfessional && account.profile.matriculeFiscal && (
          <div
            className="mb-4 flex items-center justify-between rounded-2xl border px-4 py-3"
            style={{ background: squad.card, borderColor: squad.border }}
          >
            <span className="text-[11.5px]" style={{ color: squad.textMuted }}>
              Matricule Fiscal
            </span>
            <span className="font-mono text-[12px] font-semibold">{account.profile.matriculeFiscal}</span>
          </div>
        )}

        <div className="mb-4 rounded-2xl border p-3 text-center" style={{ background: squad.card, borderColor: squad.border }}>
          <div className="font-mono text-base font-bold">{account.wallets.length}</div>
          <div className="mt-0.5 text-[10px]" style={{ color: squad.textMuted }}>
            Linked accounts
          </div>
        </div>

        <div className="mb-4 flex flex-col gap-2">
          <div
            className="flex items-center justify-between rounded-2xl border px-4 py-3"
            style={{ background: squad.card, borderColor: squad.border }}
          >
            <span className="flex items-center gap-2.5 text-[13px] font-semibold">
              <WalletIcon className="size-4" style={{ color: squad.textMuted }} />
              Linked Accounts
            </span>
            <span className="text-xs" style={{ color: squad.textFaint }}>
              {account.wallets.length} active
            </span>
          </div>
          {account.profile.isProfessional && (
            <button
              type="button"
              onClick={actions.goInvoices}
              className="flex items-center justify-between rounded-2xl border px-4 py-3 text-left"
              style={{ background: squad.card, borderColor: squad.border }}
            >
              <span className="flex items-center gap-2.5 text-[13px] font-semibold">
                <FileText className="size-4" style={{ color: squad.textMuted }} />
                Invoices (El Fatoora)
              </span>
              <span className="flex items-center gap-1 text-xs font-bold" style={{ color: squad.subtle }}>
                {account.invoices.length} <ChevronRight className="size-3.5" />
              </span>
            </button>
          )}
        </div>

        <div
          className="mb-4 rounded-2xl border p-3.5"
          style={{ background: alpha(squad.subtle, 0.08), borderColor: alpha(squad.subtle, 0.25) }}
        >
          <div className="mb-1.5 flex items-center gap-2">
            <ShieldAlert className="size-3.5" style={{ color: squad.subtle }} />
            <span className="text-[12px] font-bold">Regulatory Sandbox Pilot</span>
          </div>
          <p className="text-[11px] leading-relaxed" style={{ color: squad.textMuted }}>
            You&apos;re a volunteer participant in a Banque Centrale de
            Tunisie regulatory sandbox test of SQUAD&apos;s routing service.
            SQUAD never holds funds; all transfers execute in your own
            banking app.
          </p>
        </div>

        <button
          type="button"
          onClick={actions.logout}
          className="flex items-center justify-between rounded-2xl border px-4 py-3 text-left"
          style={{ background: squad.card, borderColor: alpha(squad.destructive, 0.3) }}
        >
          <span className="flex items-center gap-2.5 text-[13px] font-semibold" style={{ color: squad.destructive }}>
            <LogOut className="size-4" />
            Log Out
          </span>
        </button>
      </div>
      <BottomNav
        active="profile"
        onHome={actions.goHome}
        onSend={actions.goGenerateIntent}
        onActivity={actions.goActivity}
        onProfile={actions.goProfile}
      />
    </div>
  );
}
