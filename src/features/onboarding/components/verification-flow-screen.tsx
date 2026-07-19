import Link from "next/link";
import { ArrowRight, CheckCircle2, ChevronLeft, Clock3, ShieldCheck, TriangleAlert } from "lucide-react";
import type { AuthenticatedAppUser, VerificationStatus } from "@/features/auth/types";
import { formatUsernameHandle } from "@/features/auth/lib/identity";
import { DemoVerificationPanel } from "@/features/onboarding/components/demo-verification-panel";
import { alpha, cardShadow, igGradient, mou3amla } from "@/features/mou3amla/constants";
import { statusToneColor } from "@/features/mou3amla/status-tone";

function statusMeta(status: VerificationStatus, isDemoApproval: boolean) {
  if (status === "verified") {
    const tone = statusToneColor("positive");
    return {
      label: isDemoApproval ? "Verified (demo)" : "Verified",
      body: isDemoApproval
        ? "Simulated for this preview - production will run through an eKYC provider accepted by INPDP."
        : "RIB linking and trusted routes are unlocked for this profile.",
      tone,
      bg: alpha(tone, 0.12),
      icon: CheckCircle2,
    };
  }

  if (status === "pending") {
    const tone = statusToneColor("pending");
    return {
      label: "Pending review",
      body: "A previous verification attempt is on file as pending review.",
      tone,
      bg: alpha(tone, 0.14),
      icon: Clock3,
    };
  }

  if (status === "rejected") {
    const tone = statusToneColor("negative");
    return {
      label: "Needs retry",
      body: "Your previous verification attempt didn't go through. Run the demo verification below to continue.",
      tone,
      bg: alpha(tone, 0.12),
      icon: TriangleAlert,
    };
  }

  const tone = statusToneColor("neutral");
  return {
    label: "Not started",
    body: "Verify your identity to unlock bank-account routes.",
    tone,
    bg: alpha(tone, 0.1),
    icon: ShieldCheck,
  };
}

export function VerificationFlowScreen({ user }: { user: AuthenticatedAppUser }) {
  const status = statusMeta(user.verificationStatus, user.kycProviderStatus === "Demo Approved");
  const StatusIcon = status.icon;
  const canStart = user.verificationStatus === "unverified" || user.verificationStatus === "rejected";

  return (
    <div
      className="mou3amla-viewport-h flex flex-1 flex-col justify-center px-5 py-[max(1.2rem,env(safe-area-inset-top))]"
      style={{ background: `linear-gradient(180deg, ${mou3amla.surface} 0%, ${mou3amla.bg} 100%)` }}
    >
      <div className="mx-auto flex w-full max-w-md flex-col">
        <Link
          href="/home"
          aria-label="Back to home"
          className="mb-3 flex size-9 items-center justify-center self-start rounded-full"
          style={{ background: alpha(mou3amla.text, 0.06) }}
        >
          <ChevronLeft className="size-4.5" style={{ color: mou3amla.text }} />
        </Link>

        <div
          className="relative mb-4 overflow-hidden rounded-[30px] px-5 pt-5 pb-6 text-white"
          style={{ background: mou3amla.hero, boxShadow: "0 26px 70px rgba(0,0,0,0.18)" }}
        >
          <div
            className="pointer-events-none absolute -top-14 right-[-30px] h-36 w-36 rounded-full opacity-80"
            style={{ background: igGradient }}
          />
          <div className="relative">
            <div className="text-[10px] font-black uppercase tracking-[0.3em] text-white/60">Verification Studio</div>
            <div className="mt-2 text-[1.9rem] font-black leading-none">Verify your identity.</div>
          </div>

          <div className="relative mt-5 rounded-[22px] px-4 py-3" style={{ background: mou3amla.card, color: mou3amla.text }}>
            <div className="text-[12px] font-black uppercase tracking-[0.22em]" style={{ color: mou3amla.textFaint }}>
              Profile
            </div>
            <div className="mt-2 text-[13px] font-black">{formatUsernameHandle(user.username)}</div>
            <div className="mt-1 text-[11px] leading-relaxed" style={{ color: mou3amla.textMuted }}>
              Current status: <span style={{ color: status.tone }}>{status.label}</span>
            </div>
          </div>
        </div>

        <div className="rounded-[30px] border px-5 pt-5 pb-5" style={{ background: mou3amla.card, borderColor: mou3amla.border, boxShadow: cardShadow }}>
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
            <DemoVerificationPanel />
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
