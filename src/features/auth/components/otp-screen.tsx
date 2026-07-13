import { alpha, squad } from "@/features/squad/constants";
import type { UseSquadApp } from "@/features/squad/hooks/use-squad-app";

export function OtpScreen({ squadApp }: { squadApp: UseSquadApp }) {
  const { state, actions } = squadApp;

  return (
    <div className="flex flex-1 flex-col overflow-auto px-6 pt-[max(2.25rem,env(safe-area-inset-top))] pb-8">
      <div className="flex flex-1 flex-col justify-center">
        <div className="mb-2 flex items-center gap-2.5">
          <div
            className="flex size-[38px] items-center justify-center rounded-[12px]"
            style={{ background: squad.accent, boxShadow: `0 6px 16px ${alpha(squad.accent, 0.35)}` }}
          >
            <div className="size-3.5 rotate-45 rounded-[3px] border-[2.5px]" style={{ borderColor: squad.bg }} />
          </div>
          <div className="text-2xl font-extrabold tracking-wide">SQUAD</div>
        </div>
        <div className="mb-6 font-mono text-xs tracking-widest" style={{ color: squad.textFaint }}>
          VERIFICATION CODE
        </div>

        <div className="mb-2 text-[15px] font-semibold" style={{ color: squad.text }}>
          Enter the 4-digit code
        </div>
        <div className="mb-6 text-[13px] leading-relaxed" style={{ color: squad.textMuted }}>
          We sent a verification code to +216 {state.phoneInput || "..."}.
        </div>

        <div className="mb-2 text-xs font-semibold tracking-wide" style={{ color: squad.textMuted }}>
          SECURE CODE
        </div>
        <div
          className="mb-4 flex items-center gap-2.5 rounded-2xl border px-4 py-3"
          style={{ background: squad.card, borderColor: squad.borderStrong }}
        >
          <input
            autoFocus
            type="text"
            inputMode="numeric"
            maxLength={4}
            value={state.otpInput}
            onChange={(e) => actions.onOtpChange(e.target.value.replace(/\D/g, ""))}
            placeholder="0000"
            className="flex-1 border-none bg-transparent text-center font-mono text-[28px] tracking-[0.5em] outline-none"
            style={{ color: squad.text }}
          />
        </div>

        <button
          type="button"
          onClick={actions.verifyOtp}
          disabled={state.otpInput.length < 4}
          className="rounded-2xl py-3.5 text-center text-[15px] font-bold transition-opacity disabled:opacity-50"
          style={{ background: squad.accent, color: squad.bg }}
        >
          Verify & Continue
        </button>

        <button
          type="button"
          onClick={actions.logout}
          className="mt-6 text-[13px] font-semibold transition-opacity hover:opacity-75"
          style={{ color: squad.textMuted }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
