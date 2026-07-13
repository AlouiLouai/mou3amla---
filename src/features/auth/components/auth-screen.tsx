import { alpha, squad } from "@/features/squad/constants";
import type { UseSquadApp } from "@/features/squad/hooks/use-squad-app";

export function AuthScreen({ squadApp }: { squadApp: UseSquadApp }) {
  const { state, actions } = squadApp;
  const isSignup = state.authMode === "signup";

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
        <div className="mb-3 font-mono text-xs tracking-widest" style={{ color: squad.textFaint }}>
          TUNISIA · P2P PAYMENT ROUTING
        </div>
        <div
          className="mb-6 inline-flex w-fit items-center gap-1.5 rounded-full border px-2.5 py-1 text-[9.5px] font-bold tracking-wide"
          style={{ background: alpha(squad.subtle, 0.1), borderColor: alpha(squad.subtle, 0.3), color: squad.subtle }}
        >
          BCT REGULATORY SANDBOX · PILOT
        </div>

        <div
          className="mb-6 flex rounded-2xl border p-1"
          style={{ background: squad.card, borderColor: squad.border }}
        >
          <button
            type="button"
            onClick={actions.setSignup}
            className="flex-1 rounded-xl py-2.5 text-sm font-semibold transition-colors"
            style={{ background: isSignup ? squad.accent : "transparent", color: isSignup ? squad.bg : squad.textMuted }}
          >
            Sign Up
          </button>
          <button
            type="button"
            onClick={actions.setSignin}
            className="flex-1 rounded-xl py-2.5 text-sm font-semibold transition-colors"
            style={{ background: !isSignup ? squad.accent : "transparent", color: !isSignup ? squad.bg : squad.textMuted }}
          >
            Sign In
          </button>
        </div>

        <div className="mb-2 text-xs font-semibold tracking-wide" style={{ color: squad.textMuted }}>
          PHONE NUMBER
        </div>
        <div
          className="mb-4 flex items-center gap-2.5 rounded-2xl border px-4 py-3"
          style={{ background: squad.card, borderColor: squad.borderStrong }}
        >
          <span className="font-mono text-[15px] font-semibold" style={{ color: squad.accent }}>
            +216
          </span>
          <div className="h-[18px] w-px" style={{ background: squad.borderStrong }} />
          <input
            value={state.phoneInput}
            onChange={(e) => actions.onPhoneChange(e.target.value)}
            placeholder="20 123 456"
            className="flex-1 border-none bg-transparent font-mono text-[15px] outline-none"
            style={{ color: squad.text }}
          />
        </div>

        <button
          type="button"
          onClick={actions.continueAuth}
          className="rounded-2xl py-3.5 text-center text-[15px] font-bold transition-transform active:scale-[0.98]"
          style={{ background: squad.accent, color: squad.bg }}
        >
          Continue
        </button>

        <div className="my-6 flex items-center gap-2.5">
          <div className="h-px flex-1" style={{ background: squad.border }} />
          <span className="text-[11px] tracking-wide" style={{ color: squad.textFaint }}>
            OR CONTINUE WITH
          </span>
          <div className="h-px flex-1" style={{ background: squad.border }} />
        </div>

        <div className="flex gap-2.5">
          <button
            type="button"
            onClick={actions.continueAuth}
            className="flex flex-1 items-center justify-center gap-2 rounded-2xl border py-3 text-[13px] font-semibold"
            style={{ background: squad.card, borderColor: squad.borderStrong }}
          >
            <div className="size-3.5 rounded-full border-[1.6px]" style={{ borderColor: squad.text }} /> Apple
          </button>
          <button
            type="button"
            onClick={actions.continueAuth}
            className="flex flex-1 items-center justify-center gap-2 rounded-2xl border py-3 text-[13px] font-semibold"
            style={{ background: squad.card, borderColor: squad.borderStrong }}
          >
            <div
              className="size-3.5 rounded-full"
              style={{ background: `conic-gradient(${squad.accent}, ${squad.subtle}, ${squad.accent})` }}
            />
            Google
          </button>
        </div>
      </div>
      <div className="mt-5 text-center text-[10.5px] leading-relaxed" style={{ color: squad.textFaint }}>
        By continuing you agree to SQUAD&apos;s Terms and confirm you are 18+.
        SQUAD is operating as a Banque Centrale de Tunisie regulatory sandbox
        pilot — you&apos;re a voluntary test participant. See Profile for
        scope, risks, and your protections.
      </div>
    </div>
  );
}
