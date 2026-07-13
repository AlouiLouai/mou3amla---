import { ArrowRight, BadgeCheck, Globe, ScanFace, ShieldCheck } from "lucide-react";
import type { AuthenticatedAppUser } from "@/features/auth/types";
import { formatUsernameHandle } from "@/features/auth/lib/identity";
import { alpha, cardShadow, squad } from "@/features/squad/constants";

const STEPS = [
  {
    icon: ShieldCheck,
    title: "Document check",
    body: "Didit handles CIN front and CIN back capture directly in its own hosted flow.",
  },
  {
    icon: ScanFace,
    title: "Selfie match",
    body: "Face verification happens inside Didit too, without extra app modals in between.",
  },
  {
    icon: BadgeCheck,
    title: "Route unlock",
    body: "After approval, SQUAD marks your identity as verified and unlocks RIB linking.",
  },
] as const;

export function VerificationFlowScreen({ user }: { user: AuthenticatedAppUser }) {
  const isVerified = user.verificationStatus === "verified";

  return (
    <div
      className="flex min-h-[100dvh] flex-1 flex-col px-5 py-[max(1.2rem,env(safe-area-inset-top))]"
      style={{ background: `linear-gradient(180deg, ${squad.surface} 0%, ${squad.bg} 100%)` }}
    >
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col">
        <div
          className="relative mb-4 overflow-hidden rounded-[30px] px-5 pt-5 pb-6 text-white"
          style={{ background: squad.hero, boxShadow: "0 26px 70px rgba(0,0,0,0.18)" }}
        >
          <div
            className="pointer-events-none absolute -top-14 right-[-30px] h-36 w-36 rounded-full"
            style={{ background: "linear-gradient(135deg, rgba(255,0,131,0.95), rgba(255,141,40,0.88))" }}
          />
          <div className="relative flex items-center justify-between">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.3em] text-white/60">Didit</div>
              <div className="mt-2 text-[1.9rem] font-black leading-none">Verify your identity.</div>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-white/14 bg-white/10 px-3 py-2 text-[12px] font-semibold text-white/84">
              <Globe className="size-4" />
              <span>FR</span>
            </div>
          </div>

          <div className="relative mt-5 rounded-[22px] bg-white px-4 py-3 text-black">
            <div className="text-[12px] font-black uppercase tracking-[0.22em]" style={{ color: squad.textFaint }}>
              Profile
            </div>
            <div className="mt-2 text-[13px] font-black">{formatUsernameHandle(user.username)}</div>
            <div className="mt-1 text-[11px] leading-relaxed" style={{ color: squad.textMuted }}>
              Current status: <span style={{ color: squad.accent }}>{user.verificationStatus}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-1 flex-col rounded-[30px] border bg-white px-5 pt-5 pb-5" style={{ borderColor: squad.border, boxShadow: cardShadow }}>
          <div className="mb-4 text-[1.65rem] font-black leading-none">Didit keeps its own flow.</div>
          <p className="mb-5 text-[12px] leading-relaxed" style={{ color: squad.textMuted }}>
            Once you continue, we send you straight into Didit. We do not insert extra SQUAD modals between CIN front, CIN back, and selfie capture.
          </p>

          <div className="flex flex-1 flex-col justify-center gap-4">
            {STEPS.map((step, index) => {
              const Icon = step.icon;

              return (
                <div key={step.title} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div
                      className="flex size-10 items-center justify-center rounded-2xl"
                      style={{ background: alpha(index === 1 ? squad.subtle : squad.accent, 0.12), color: index === 1 ? squad.subtle : squad.accent }}
                    >
                      <Icon className="size-5" />
                    </div>
                    {index < STEPS.length - 1 ? (
                      <div
                        className="mt-2 h-10 w-1 rounded-full"
                        style={{ background: `linear-gradient(180deg, ${index === 1 ? squad.subtle : squad.accent}, ${alpha(index === 1 ? squad.subtle : squad.accent, 0.18)})` }}
                      />
                    ) : null}
                  </div>
                  <div className="pt-1">
                    <div className="text-[15px] font-black">{step.title}</div>
                    <p className="mt-1 text-[11.5px] leading-relaxed" style={{ color: squad.textMuted }}>
                      {step.body}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          <form action="/api/didit/session" method="post" className="mt-7">
            <button
              type="submit"
              disabled={isVerified}
              className="flex w-full items-center justify-center gap-2 rounded-[18px] py-3.5 text-[15px] font-black transition-opacity disabled:opacity-60"
              style={{ background: squad.accent, color: "#FFFFFF", boxShadow: cardShadow }}
            >
              <span>{isVerified ? "Already verified" : "Continue to Didit"}</span>
              {!isVerified ? <ArrowRight className="size-4" /> : null}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
