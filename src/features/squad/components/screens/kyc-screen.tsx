import { Check, ChevronLeft, IdCard, ScanFace } from "lucide-react";
import { alpha, squad } from "@/features/squad/constants";
import type { UseSquadApp } from "@/features/squad/hooks/use-squad-app";

export function KycScreen({ squadApp }: { squadApp: UseSquadApp }) {
  const { state, actions } = squadApp;
  const step = state.kycStep;
  const showBack = step === "intro" || step === "success";

  return (
    <div className="flex flex-1 flex-col overflow-auto px-6 pt-[max(1.125rem,env(safe-area-inset-top))] pb-8">
      {showBack && (
        <button
          type="button"
          onClick={actions.kycBack}
          className="mb-5 flex size-8 items-center justify-center rounded-[9px] border"
          style={{ background: squad.card, borderColor: "rgba(255,255,255,0.08)" }}
        >
          <ChevronLeft className="size-4" />
        </button>
      )}

      {step === "intro" && (
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <div
            className="mb-[22px] flex size-[68px] items-center justify-center rounded-[20px] border"
            style={{ background: alpha(squad.purple, 0.12), borderColor: alpha(squad.purple, 0.35) }}
          >
            <IdCard className="size-7" style={{ color: squad.purple }} />
          </div>
          <div className="mb-2 text-xl font-extrabold">Identity Verification</div>
          <div className="mb-[26px] max-w-[280px] text-[13px] leading-relaxed" style={{ color: "rgba(244,245,246,0.55)" }}>
            SQUAD partners with Didit for secure, encrypted identity checks. You&apos;ll scan your Tunisian National
            ID and complete a brief 3D liveness selfie.
          </div>
          <div className="mb-[30px] flex w-full flex-col gap-2.5">
            {["National ID card — front & back scan", "3D selfie liveness check — takes 10 seconds"].map((line) => (
              <div
                key={line}
                className="flex items-center gap-2.5 rounded-xl border px-3.5 py-3 text-left"
                style={{ background: squad.card, borderColor: "rgba(255,255,255,0.08)" }}
              >
                <div className="size-2 shrink-0 rounded-full" style={{ background: squad.purple }} />
                <span className="text-[12.5px]" style={{ color: "rgba(244,245,246,0.75)" }}>
                  {line}
                </span>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={actions.kycStart}
            className="w-full rounded-xl py-[15px] text-[15px] font-bold"
            style={{ background: squad.purple, color: "#0A0018" }}
          >
            Start Verification
          </button>
          <div className="mt-3.5 font-mono text-[10px]" style={{ color: "rgba(244,245,246,0.28)" }}>
            SECURED BY DIDIT · SESSION #{state.kycSessionId}
          </div>
        </div>
      )}

      {(step === "front" || step === "back") && (
        <div className="flex flex-1 flex-col items-center justify-center">
          <div className="mb-4 text-[12.5px] font-bold tracking-wide" style={{ color: "rgba(244,245,246,0.55)" }}>
            {step === "front" ? "SCANNING ID — FRONT" : "SCANNING ID — BACK"}
          </div>
          <div
            className="relative h-[165px] w-[260px] overflow-hidden rounded-2xl border"
            style={{ background: "#101114", borderColor: "rgba(255,255,255,0.08)" }}
          >
            <div
              className="absolute inset-3.5 rounded-[10px] border-2 border-dashed"
              style={{ borderColor: alpha(squad.purple, 0.4) }}
            />
            <div className="absolute top-2.5 left-2.5 size-[18px] rounded-tl-[4px] border-t-[2.5px] border-l-[2.5px]" style={{ borderColor: squad.purple }} />
            <div className="absolute top-2.5 right-2.5 size-[18px] rounded-tr-[4px] border-t-[2.5px] border-r-[2.5px]" style={{ borderColor: squad.purple }} />
            <div className="absolute bottom-2.5 left-2.5 size-[18px] rounded-bl-[4px] border-b-[2.5px] border-l-[2.5px]" style={{ borderColor: squad.purple }} />
            <div className="absolute right-2.5 bottom-2.5 size-[18px] rounded-br-[4px] border-r-[2.5px] border-b-[2.5px]" style={{ borderColor: squad.purple }} />
            <div
              className="absolute inset-x-0 top-0 h-0.5 animate-[squad-scanline_1.6s_ease-in-out_infinite]"
              style={{ background: `linear-gradient(90deg, transparent, ${squad.purple}, transparent)` }}
            />
          </div>
          <div className="mt-4 text-xs" style={{ color: "rgba(244,245,246,0.4)" }}>
            Hold steady…
          </div>
        </div>
      )}

      {step === "liveness" && (
        <div className="flex flex-1 flex-col items-center justify-center">
          <div className="mb-5 text-[12.5px] font-bold tracking-wide" style={{ color: "rgba(244,245,246,0.55)" }}>
            3D SELFIE LIVENESS CHECK
          </div>
          <div className="relative flex size-[200px] items-center justify-center">
            <div className="absolute inset-0 rounded-full border-[3px]" style={{ borderColor: alpha(squad.purple, 0.15) }} />
            <div
              className="absolute inset-0 animate-spin rounded-full border-[3px] border-transparent"
              style={{ borderTopColor: squad.purple, borderRightColor: squad.purple, animationDuration: "1.4s" }}
            />
            <div
              className="flex size-[150px] items-center justify-center rounded-full border"
              style={{ background: "#101114", borderColor: "rgba(255,255,255,0.08)" }}
            >
              <ScanFace className="size-14" style={{ color: "rgba(244,245,246,0.5)" }} />
            </div>
          </div>
          <div className="mt-4.5 text-xs" style={{ color: "rgba(244,245,246,0.4)" }}>
            Look straight ahead, then slowly turn your head
          </div>
        </div>
      )}

      {step === "processing" && (
        <div className="flex flex-1 flex-col items-center justify-center">
          <div
            className="mb-[22px] size-[60px] animate-spin rounded-full border-[3px]"
            style={{ borderColor: alpha(squad.purple, 0.15), borderTopColor: squad.purple }}
          />
          <div className="mb-2 text-[15px] font-bold">Verifying with Didit…</div>
          <div
            className="text-center font-mono text-[10.5px] leading-relaxed"
            style={{ color: "rgba(244,245,246,0.35)" }}
          >
            webhook: kyc.session.completed
            <br />
            status → pending
          </div>
        </div>
      )}

      {step === "success" && (
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <div
            className="mb-[22px] flex size-[84px] animate-[squad-glow_2s_ease-in-out_infinite] items-center justify-center rounded-full border"
            style={{ background: alpha(squad.green, 0.12), borderColor: alpha(squad.green, 0.4) }}
          >
            <Check className="size-8" style={{ color: squad.green }} />
          </div>
          <div className="mb-2 text-[21px] font-extrabold">You&apos;re Verified</div>
          <div className="mb-[30px] max-w-[260px] text-[13px] leading-relaxed" style={{ color: "rgba(244,245,246,0.55)" }}>
            Transfers are now unlocked. Welcome to the SQUAD network.
          </div>
          <button
            type="button"
            onClick={actions.finishKyc}
            className="w-full rounded-xl py-[15px] text-[15px] font-bold"
            style={{ background: squad.green, color: "#06110B" }}
          >
            Continue to SQUAD
          </button>
        </div>
      )}
    </div>
  );
}
