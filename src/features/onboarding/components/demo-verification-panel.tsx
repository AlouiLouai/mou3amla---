"use client";

import { CheckCircle2, Loader2 } from "lucide-react";
import { useDemoVerification } from "@/features/onboarding/hooks/use-demo-verification";
import { alpha, cardShadow, mou3amla } from "@/features/mou3amla/constants";

export function DemoVerificationPanel() {
  const { steps, stepIndex, running, done, error, start } = useDemoVerification();

  return (
    <div>
      <div
        className="mb-4 rounded-[22px] border px-4 py-3 text-[11.5px] leading-relaxed"
        style={{ background: alpha(mou3amla.subtle, 0.14), borderColor: alpha(mou3amla.subtle, 0.3), color: mou3amla.text }}
      >
        <strong>Demo mode.</strong> This verification is simulated for this preview - no document or selfie is
        actually captured or checked. Production will integrate an eKYC provider accepted by INPDP before launch.
      </div>

      {running ? (
        <div className="mb-4 space-y-2">
          {steps.map((step, index) => (
            <div
              key={step}
              className="flex items-center gap-2 text-[12px]"
              style={{ color: index <= stepIndex ? mou3amla.text : mou3amla.textFaint }}
            >
              {index < stepIndex ? (
                <CheckCircle2 className="size-4" style={{ color: "#139A63" }} />
              ) : index === stepIndex ? (
                <Loader2 className="size-4 animate-spin" style={{ color: mou3amla.accent }} />
              ) : (
                <div className="size-4 rounded-full border" style={{ borderColor: mou3amla.border }} />
              )}
              {step}
            </div>
          ))}
        </div>
      ) : null}

      {error ? (
        <div
          className="mb-4 rounded-[18px] border px-4 py-3 text-[12px] leading-relaxed"
          style={{ background: alpha(mou3amla.destructive, 0.08), borderColor: alpha(mou3amla.destructive, 0.22), color: mou3amla.destructive }}
        >
          {error}
        </div>
      ) : null}

      <button
        type="button"
        onClick={start}
        disabled={running || done}
        className="flex w-full items-center justify-center gap-2 rounded-[18px] py-3.5 text-[14px] font-black transition-opacity disabled:opacity-60"
        style={{ background: mou3amla.accent, color: "#FFFFFF", boxShadow: cardShadow }}
      >
        {done ? "Verified - refreshing..." : running ? "Running demo verification..." : "Run demo verification"}
      </button>
    </div>
  );
}
