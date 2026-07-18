import Link from "next/link";
import { ArrowRight, CheckCircle2, Clock3, ShieldCheck, TriangleAlert } from "lucide-react";
import type { AuthenticatedAppUser, VerificationStatus } from "@/features/auth/types";
import { formatUsernameHandle } from "@/features/auth/lib/identity";
import { alpha, cardShadow, mou3amla } from "@/features/mou3amla/constants";

function statusMeta(status: VerificationStatus) {
  if (status === "verified") {
    return {
      label: "Verified",
      body: "RIB linking and trusted routes are unlocked for this profile.",
      tone: "#139A63",
      bg: "rgba(19,154,99,0.12)",
      icon: CheckCircle2,
    };
  }

  if (status === "pending") {
    return {
      label: "Pending review",
      body: "Didit is reviewing your file. This screen updates automatically once a decision comes back.",
      tone: mou3amla.subtle,
      bg: alpha(mou3amla.subtle, 0.14),
      icon: Clock3,
    };
  }

  if (status === "rejected") {
    return {
      label: "Needs retry",
      body: "Didit couldn't confirm your identity from that attempt. Start again with clearer photos.",
      tone: mou3amla.destructive,
      bg: alpha(mou3amla.destructive, 0.12),
      icon: TriangleAlert,
    };
  }

  return {
    label: "Not started",
    body: "Verify your identity to unlock bank-account routes.",
    tone: mou3amla.accent,
    bg: alpha(mou3amla.accent, 0.1),
    icon: ShieldCheck,
  };
}

export function VerificationFlowScreen({ user }: { user: AuthenticatedAppUser }) {
  const status = statusMeta(user.verificationStatus);
  const StatusIcon = status.icon;
  const canStart = user.verificationStatus === "unverified" || user.verificationStatus === "rejected";

  return (
    <div
      className="mou3amla-viewport-h flex flex-1 flex-col justify-center px-5 py-[max(1.2rem,env(safe-area-inset-top))]"
      style={{ background: `linear-gradient(180deg, ${mou3amla.surface} 0%, ${mou3amla.bg} 100%)` }}
    >
      <div className="mx-auto flex w-full max-w-md flex-col">
        <div
          className="relative mb-4 overflow-hidden rounded-[30px] px-5 pt-5 pb-6 text-white"
          style={{ background: mou3amla.hero, boxShadow: "0 26px 70px rgba(0,0,0,0.18)" }}
        >
          <div
            className="pointer-events-none absolute -top-14 right-[-30px] h-36 w-36 rounded-full"
            style={{ background: "linear-gradient(135deg, rgba(255,0,131,0.95), rgba(255,141,40,0.88))" }}
          />
          <div className="relative">
            <div className="text-[10px] font-black uppercase tracking-[0.3em] text-white/60">Verification Studio</div>
            <div className="mt-2 text-[1.9rem] font-black leading-none">Verify your identity.</div>
          </div>

          <div className="relative mt-5 rounded-[22px] bg-white px-4 py-3 text-black">
            <div className="text-[12px] font-black uppercase tracking-[0.22em]" style={{ color: mou3amla.textFaint }}>
              Profile
            </div>
            <div className="mt-2 text-[13px] font-black">{formatUsernameHandle(user.username)}</div>
            <div className="mt-1 text-[11px] leading-relaxed" style={{ color: mou3amla.textMuted }}>
              Current status: <span style={{ color: status.tone }}>{status.label}</span>
            </div>
          </div>
        </div>

        <div className="rounded-[30px] border bg-white px-5 pt-5 pb-5" style={{ borderColor: mou3amla.border, boxShadow: cardShadow }}>
          <div
            className="mb-4 rounded-[22px] border px-4 py-3"
            style={{ background: status.bg, borderColor: alpha(status.tone, 0.16), color: status.tone }}
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex size-9 items-center justify-center rounded-2xl" style={{ background: alpha(status.tone, 0.12) }}>
                <StatusIcon className="size-4.5" />
              </div>
              <div>
                <div className="text-[13px] font-black">{status.label}</div>
                <p className="mt-1 text-[11.5px] leading-relaxed" style={{ color: mou3amla.text }}>
                  {status.body}
                </p>
              </div>
            </div>
          </div>

          {canStart ? (
            <>
              <p className="mb-4 text-[12px] leading-relaxed" style={{ color: mou3amla.textMuted }}>
                Mou3amla hands identity verification off to Didit, our identity-verification partner. You&rsquo;ll
                photograph your CIN and take a live selfie on Didit&rsquo;s hosted screen, then land back here
                automatically.
              </p>

              <form action="/api/didit/session" method="POST">
                <button
                  type="submit"
                  className="flex w-full items-center justify-center gap-2 rounded-[18px] py-3.5 text-[14px] font-black"
                  style={{ background: mou3amla.accent, color: "#FFFFFF", boxShadow: cardShadow }}
                >
                  Continue with Didit
                  <ArrowRight className="size-4" />
                </button>
              </form>
            </>
          ) : user.verificationStatus === "verified" ? (
            <Link
              href="/home"
              className="flex w-full items-center justify-center gap-2 rounded-[18px] py-3.5 text-[14px] font-black"
              style={{ background: mou3amla.accent, color: "#FFFFFF" }}
            >
              Continue to dashboard
              <ArrowRight className="size-4" />
            </Link>
          ) : (
            <Link
              href="/home"
              className="flex w-full items-center justify-center gap-2 rounded-[18px] border py-3.5 text-[14px] font-black"
              style={{ borderColor: mou3amla.border, color: mou3amla.text }}
            >
              Back to dashboard
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
