import { squad } from "@/features/squad/constants";
import type { UseSquadApp } from "@/features/squad/hooks/use-squad-app";

export function OtpScreen({ squadApp }: { squadApp: UseSquadApp }) {
    const { state, actions } = squadApp;

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
                    VERIFICATION CODE
                </div>

                <div className="mb-2 text-[15px] font-semibold" style={{ color: squad.text }}>
                    Enter the 4-digit code
                </div>
                <div className="mb-8 text-[13px] leading-relaxed" style={{ color: "rgba(244,245,246,0.5)" }}>
                    We sent a verification code to +216 {state.phoneInput || "..."}.
                </div>

                <div className="mb-2 text-xs font-semibold tracking-wide" style={{ color: "rgba(244,245,246,0.45)" }}>
                    SECURE CODE
                </div>
                <div
                    className="mb-[22px] flex items-center gap-2.5 rounded-xl border px-4 py-3.5"
                    style={{ background: squad.card, borderColor: "rgba(255,255,255,0.1)" }}
                >
                    <input
                        autoFocus
                        type="text"
                        inputMode="numeric"
                        maxLength={4}
                        value={state.otpInput}
                        onChange={(e) => actions.onOtpChange(e.target.value.replace(/\D/g, ''))}
                        placeholder="0000"
                        className="flex-1 border-none bg-transparent text-center font-mono text-[28px] tracking-[0.5em] outline-none placeholder:text-[rgba(244,245,246,0.15)] focus:ring-0"
                    />
                </div>

                <button
                    type="button"
                    onClick={actions.verifyOtp}
                    disabled={state.otpInput.length < 4}
                    className="rounded-xl py-[15px] text-center text-[15px] font-bold transition-opacity disabled:opacity-50"
                    style={{ background: squad.green, color: "#06110B" }}
                >
                    Verify & Continue
                </button>

                <button
                    type="button"
                    onClick={actions.logout}
                    className="mt-6 text-[13px] font-semibold transition-opacity hover:opacity-75"
                    style={{ color: "rgba(244,245,246,0.5)" }}
                >
                    Cancel
                </button>
            </div>
        </div>
    );
}
