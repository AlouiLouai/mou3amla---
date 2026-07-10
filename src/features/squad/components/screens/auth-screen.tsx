import { squad } from "@/features/squad/constants";
import type { UseSquadApp } from "@/features/squad/hooks/use-squad-app";

export function AuthScreen({ squadApp }: { squadApp: UseSquadApp }) {
  const { state, actions } = squadApp;
  const isSignup = state.authMode === "signup";

  return (
    <div className="flex flex-1 flex-col overflow-auto px-6 pt-[max(2.25rem,env(safe-area-inset-top))] pb-8">
      <div className="flex flex-1 flex-col justify-center">
        <div className="mb-1.5 flex items-center gap-2.5">
          <div
            className="flex size-[34px] items-center justify-center rounded-[9px]"
            style={{ background: squad.green }}
          >
            <div className="size-3.5 rotate-45 rounded-[3px] border-[2.5px]" style={{ borderColor: "#06110B" }} />
          </div>
          <div className="text-2xl font-extrabold tracking-wide">SQUAD</div>
        </div>
        <div
          className="mb-10 font-mono text-xs tracking-widest"
          style={{ color: "rgba(244,245,246,0.4)" }}
        >
          TUNISIA · P2P SOCIAL LEDGER
        </div>

        <div
          className="mb-6 flex rounded-xl border p-1"
          style={{ background: squad.card, borderColor: "rgba(255,255,255,0.08)" }}
        >
          <button
            type="button"
            onClick={actions.setSignup}
            className="flex-1 rounded-[9px] py-2.5 text-sm font-semibold"
            style={{ background: isSignup ? squad.green : "transparent", color: isSignup ? "#06110B" : "rgba(244,245,246,0.5)" }}
          >
            Sign Up
          </button>
          <button
            type="button"
            onClick={actions.setSignin}
            className="flex-1 rounded-[9px] py-2.5 text-sm font-semibold"
            style={{ background: !isSignup ? squad.green : "transparent", color: !isSignup ? "#06110B" : "rgba(244,245,246,0.5)" }}
          >
            Sign In
          </button>
        </div>

        <div className="mb-2 text-xs font-semibold tracking-wide" style={{ color: "rgba(244,245,246,0.45)" }}>
          PHONE NUMBER
        </div>
        <div
          className="mb-[22px] flex items-center gap-2.5 rounded-xl border px-4 py-3.5"
          style={{ background: squad.card, borderColor: "rgba(255,255,255,0.1)" }}
        >
          <span className="font-mono text-[15px] font-semibold" style={{ color: squad.green }}>
            +216
          </span>
          <div className="h-[18px] w-px" style={{ background: "rgba(255,255,255,0.12)" }} />
          <input
            value={state.phoneInput}
            onChange={(e) => actions.onPhoneChange(e.target.value)}
            placeholder="20 123 456"
            className="flex-1 border-none bg-transparent font-mono text-[15px] outline-none placeholder:text-[rgba(244,245,246,0.3)]"
          />
        </div>

        <button
          type="button"
          onClick={actions.continueAuth}
          className="rounded-xl py-[15px] text-center text-[15px] font-bold"
          style={{ background: squad.green, color: "#06110B" }}
        >
          Continue
        </button>

        <div className="my-6 flex items-center gap-2.5">
          <div className="h-px flex-1" style={{ background: "rgba(255,255,255,0.08)" }} />
          <span className="text-[11px] tracking-wide" style={{ color: "rgba(244,245,246,0.32)" }}>
            OR CONTINUE WITH
          </span>
          <div className="h-px flex-1" style={{ background: "rgba(255,255,255,0.08)" }} />
        </div>

        <div className="flex gap-2.5">
          <button
            type="button"
            onClick={actions.continueAuth}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border py-3 text-[13px] font-semibold"
            style={{ background: squad.card, borderColor: "rgba(255,255,255,0.1)" }}
          >
            <div className="size-3.5 rounded-full border-[1.6px]" style={{ borderColor: squad.text }} /> Apple
          </button>
          <button
            type="button"
            onClick={actions.continueAuth}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border py-3 text-[13px] font-semibold"
            style={{ background: squad.card, borderColor: "rgba(255,255,255,0.1)" }}
          >
            <div
              className="size-3.5 rounded-full"
              style={{ background: `conic-gradient(${squad.green}, ${squad.purple}, ${squad.green})` }}
            />
            Google
          </button>
        </div>
      </div>
      <div className="mt-5 text-center text-[10.5px] leading-relaxed" style={{ color: "rgba(244,245,246,0.28)" }}>
        By continuing you agree to SQUAD&apos;s Terms and confirm you are 18+. Identity verification required for
        transfers.
      </div>
    </div>
  );
}
