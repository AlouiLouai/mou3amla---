import { Check } from "lucide-react";
import { alpha, mou3amla } from "@/features/mou3amla/constants";

// Goal Gradient Effect: a returning-to-this-flow user (or a first-time
// visitor who hasn't typed anything yet) should never perceive themselves as
// starting from zero. Step 1 ("Device Connected") is marked done as soon as
// this renders - the fact that a WebAuthn-capable browser is here at all is
// a real, true precondition for the passkey step later, not a fabricated
// freebie step. That puts everyone at 33% before they've entered a single
// field. Purely presentational - no local state, no effects.
export function OnboardingStepper({ currentStep, labels }: { currentStep: 1 | 2 | 3; labels: [string, string, string] }) {
  return (
    <div className="flex items-center gap-1.5" role="progressbar" aria-valuenow={currentStep} aria-valuemin={1} aria-valuemax={3}>
      {labels.map((label, index) => {
        const step = (index + 1) as 1 | 2 | 3;
        const done = step < currentStep;
        const active = step === currentStep;

        return (
          <div key={label} className="flex flex-1 flex-col gap-1.5">
            <div
              className="h-1.5 rounded-full transition-colors"
              style={{ background: done || active ? mou3amla.accent : alpha(mou3amla.text, 0.14) }}
            />
            <div className="flex items-center gap-1">
              {done ? <Check className="size-3" style={{ color: mou3amla.accent }} /> : null}
              <span
                className="truncate text-[9.5px] font-black uppercase tracking-[0.06em]"
                style={{ color: done || active ? mou3amla.text : mou3amla.textFaint }}
              >
                {label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
