import { ChevronLeft, Delete } from "lucide-react";
import { alpha, squad } from "@/features/squad/constants";
import type { UseSquadApp } from "@/features/squad/hooks/use-squad-app";
import { WalletIcon } from "@/features/wallets/components/wallet-icon";

const KEYPAD_KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "⌫"];

export function GenerateIntentScreen({ squadApp }: { squadApp: UseSquadApp }) {
  const { state, derived, actions } = squadApp;
  const account = derived.account;
  const amountDisplay = state.amount || "0";
  const canGenerate = parseFloat(state.amount) > 0 && state.recipientInput.trim().length > 0;

  return (
    <div className="flex flex-1 flex-col overflow-auto px-6 pt-[max(1.125rem,env(safe-area-inset-top))] pb-8">
      <button
        type="button"
        onClick={actions.goHome}
        className="mb-4.5 flex size-9 items-center justify-center rounded-full border"
        style={{ background: squad.card, borderColor: squad.border }}
      >
        <ChevronLeft className="size-4" />
      </button>

      <div className="mb-4 font-mono text-[11px]" style={{ color: squad.textFaint }}>
        Paying as @{account.profile.username}
      </div>

      <div className="mb-2 text-[11px] font-semibold tracking-wide" style={{ color: squad.textMuted }}>
        FROM
      </div>
      <div className="mb-4 flex flex-wrap gap-2">
        {account.wallets.map((wallet) => {
          const selected = wallet.id === account.sourceWalletId;
          return (
            <button
              key={wallet.id}
              type="button"
              onClick={() => actions.selectSource(wallet.id)}
              className="flex items-center gap-1.5 rounded-full border px-3 py-2 transition-colors"
              style={{
                background: selected ? alpha(wallet.color, 0.16) : squad.card,
                borderColor: selected ? wallet.color : squad.border,
              }}
            >
              <div
                className="flex size-4.5 items-center justify-center rounded-full text-[8px] font-extrabold"
                style={{ background: alpha(wallet.color, 0.16), color: wallet.color }}
              >
                <WalletIcon id={wallet.providerId} initials={wallet.initials} className="size-[10px]" />
              </div>
              <span className="text-xs font-semibold" style={{ color: selected ? squad.text : squad.textMuted }}>
                {wallet.name}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mb-2 text-[11px] font-semibold tracking-wide" style={{ color: squad.textMuted }}>
        TO
      </div>
      <div
        className="mb-4 flex items-center gap-2.5 rounded-2xl border px-4 py-3"
        style={{ background: squad.card, borderColor: squad.borderStrong }}
      >
        <span className="font-mono text-[15px]" style={{ color: squad.accent }}>
          @
        </span>
        <input
          value={state.recipientInput.replace(/^@/, "")}
          onChange={(e) => actions.onRecipientChange(e.target.value)}
          placeholder="recipient_username"
          className="flex-1 border-none bg-transparent font-mono text-[15px] outline-none"
          style={{ color: squad.text }}
        />
        <button type="button" onClick={actions.goScanQr} className="text-xs font-bold" style={{ color: squad.accent }}>
          Scan
        </button>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <div className="font-mono text-[44px] font-semibold tracking-tight">
          {amountDisplay} <span className="text-xl" style={{ color: squad.accent }}>DT</span>
        </div>
        <button
          type="button"
          onClick={actions.quickAmount5}
          className="mt-3.5 rounded-full border px-3.5 py-1.5 text-xs font-bold"
          style={{ color: squad.accent, background: alpha(squad.accent, 0.1), borderColor: alpha(squad.accent, 0.3) }}
        >
          +5 DT quick
        </button>
      </div>

      <div className="my-4.5 grid grid-cols-3 gap-2.5">
        {KEYPAD_KEYS.map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => (k === "⌫" ? actions.keypadBackspace() : actions.keypadPress(k))}
            className="flex items-center justify-center rounded-2xl border py-3.5 text-lg font-semibold transition-transform active:scale-95"
            style={{ background: squad.card, borderColor: squad.border }}
          >
            {k === "⌫" ? <Delete className="size-4.5" /> : k}
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={actions.generateIntent}
        disabled={!canGenerate}
        className="rounded-2xl py-3.5 text-[15px] font-bold transition-opacity disabled:opacity-40"
        style={{ background: squad.accent, color: squad.bg }}
      >
        Send Payment
      </button>
    </div>
  );
}
