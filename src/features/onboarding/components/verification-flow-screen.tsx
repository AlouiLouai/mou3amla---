"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock3,
  CreditCard,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";
import type { AuthenticatedAppUser } from "@/features/auth/types";
import type { VerificationStatus } from "@/features/auth/types";
import { formatUsernameHandle } from "@/features/auth/lib/identity";
import { CinCaptureStep } from "@/features/onboarding/components/cin-capture-step";
import { SelfieCaptureStep } from "@/features/onboarding/components/selfie-capture-step";
import { setMockVerificationStatus } from "@/features/onboarding/server/actions";
import { alpha, cardShadow, squad } from "@/features/squad/constants";

type StepId = "intro" | "cin-front" | "cin-back" | "selfie" | "review";

const STEP_ORDER: StepId[] = ["intro", "cin-front", "cin-back", "selfie", "review"];

const STEP_META: Record<StepId, { eyebrow: string; title: string; body: string }> = {
  intro: {
    eyebrow: "Step 01",
    body: "You'll take a photo of the front and back of your CIN, then a live selfie. Everything happens on this device.",
    title: "Verify your identity",
  },
  "cin-front": {
    eyebrow: "Step 02",
    title: "CIN front",
    body: "Use your camera or pick a photo from your library. Keep the whole card in frame.",
  },
  "cin-back": {
    eyebrow: "Step 03",
    title: "CIN back",
    body: "Now the reverse side of the same card.",
  },
  selfie: {
    eyebrow: "Step 04",
    title: "Face match",
    body: "Center your face inside the circle. The photo is taken automatically once you're aligned.",
  },
  review: {
    eyebrow: "Step 05",
    title: "Review outcome",
    body: "Comparing your ID photo with your selfie.",
  },
};

const COMPARE_DELAY_MS = 1500;
const REDIRECT_DELAY_MS = 1400;

function statusMeta(status: VerificationStatus) {
  if (status === "verified") {
    return {
      label: "Verified",
      body: "RIB linking is already unlocked for this profile.",
      tone: "#139A63",
      bg: "rgba(19,154,99,0.12)",
      icon: CheckCircle2,
    };
  }

  if (status === "pending") {
    return {
      label: "Pending review",
      body: "This profile is waiting on a manual demo decision.",
      tone: squad.subtle,
      bg: alpha(squad.subtle, 0.14),
      icon: Clock3,
    };
  }

  if (status === "rejected") {
    return {
      label: "Needs retry",
      body: "Retake your CIN and selfie photos to try again.",
      tone: squad.destructive,
      bg: alpha(squad.destructive, 0.12),
      icon: TriangleAlert,
    };
  }

  return {
    label: "Not started",
    body: "Verify your identity to unlock bank-account routes.",
    tone: squad.accent,
    bg: alpha(squad.accent, 0.1),
    icon: ShieldCheck,
  };
}

function initialStep(user: AuthenticatedAppUser, resultStatus: VerificationStatus | null): StepId {
  if (resultStatus === "verified" || user.verificationStatus === "verified") {
    return "review";
  }

  return "intro";
}

export function VerificationFlowScreen({
  user,
  resultStatus,
}: {
  user: AuthenticatedAppUser;
  resultStatus: VerificationStatus | null;
}) {
  const router = useRouter();
  const [stepId, setStepId] = useState<StepId>(() => initialStep(user, resultStatus));
  const [frontPreviewUrl, setFrontPreviewUrl] = useState<string | null>(null);
  const [backPreviewUrl, setBackPreviewUrl] = useState<string | null>(null);
  const [selfieDataUrl, setSelfieDataUrl] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const hasSubmittedRef = useRef(false);
  const previewUrlsRef = useRef({ front: frontPreviewUrl, back: backPreviewUrl });

  useEffect(() => {
    previewUrlsRef.current = { front: frontPreviewUrl, back: backPreviewUrl };
  });

  useEffect(() => {
    return () => {
      if (previewUrlsRef.current.front) URL.revokeObjectURL(previewUrlsRef.current.front);
      if (previewUrlsRef.current.back) URL.revokeObjectURL(previewUrlsRef.current.back);
    };
  }, []);

  const derivedStatus = resultStatus ?? user.verificationStatus;
  const status = statusMeta(derivedStatus);
  const StatusIcon = status.icon;
  const stepMeta = STEP_META[stepId];
  const stepPosition = STEP_ORDER.indexOf(stepId) + 1;

  useEffect(() => {
    if (stepId !== "review" || derivedStatus === "verified" || hasSubmittedRef.current) return;
    hasSubmittedRef.current = true;

    const timer = setTimeout(() => {
      startTransition(() => {
        void setMockVerificationStatus("verified");
      });
    }, COMPARE_DELAY_MS);

    return () => clearTimeout(timer);
  }, [stepId, derivedStatus]);

  useEffect(() => {
    if (stepId !== "review" || derivedStatus !== "verified") return;

    const timer = setTimeout(() => router.push("/home"), REDIRECT_DELAY_MS);
    return () => clearTimeout(timer);
  }, [stepId, derivedStatus, router]);

  function handleFrontCapture(file: File) {
    setFrontPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
  }

  function handleFrontRetake() {
    setFrontPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
  }

  function handleBackCapture(file: File) {
    setBackPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
  }

  function handleBackRetake() {
    setBackPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
  }

  const canContinue =
    stepId === "intro" ||
    (stepId === "cin-front" && !!frontPreviewUrl) ||
    (stepId === "cin-back" && !!backPreviewUrl) ||
    (stepId === "selfie" && !!selfieDataUrl);

  function goNext() {
    const index = STEP_ORDER.indexOf(stepId);
    const next = STEP_ORDER[index + 1];
    if (next) setStepId(next);
  }

  function goBack() {
    const index = STEP_ORDER.indexOf(stepId);
    const prev = STEP_ORDER[index - 1];
    if (prev) setStepId(prev);
  }

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
              <div className="text-[10px] font-black uppercase tracking-[0.3em] text-white/60">Verification Studio</div>
              <div className="mt-2 text-[1.9rem] font-black leading-none">Verify your identity.</div>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-white/14 bg-white/10 px-3 py-2 text-[12px] font-semibold text-white/84">
              <CreditCard className="size-4" />
              <span>SQUAD</span>
            </div>
          </div>

          <div className="relative mt-5 rounded-[22px] bg-white px-4 py-3 text-black">
            <div className="text-[12px] font-black uppercase tracking-[0.22em]" style={{ color: squad.textFaint }}>
              Profile
            </div>
            <div className="mt-2 text-[13px] font-black">{formatUsernameHandle(user.username)}</div>
            <div className="mt-1 text-[11px] leading-relaxed" style={{ color: squad.textMuted }}>
              Current status: <span style={{ color: status.tone }}>{status.label}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-1 flex-col rounded-[30px] border bg-white px-5 pt-5 pb-5" style={{ borderColor: squad.border, boxShadow: cardShadow }}>
          {stepId !== "review" ? (
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
                  <p className="mt-1 text-[11.5px] leading-relaxed" style={{ color: squad.text }}>
                    {status.body}
                  </p>
                </div>
              </div>
            </div>
          ) : null}

          {stepId !== "review" ? (
            <div className="mb-4 flex gap-2">
              {STEP_ORDER.slice(0, -1).map((step, index) => (
                <div
                  key={step}
                  className="h-1.5 flex-1 rounded-full"
                  style={{ background: index + 1 <= stepPosition ? squad.accent : alpha(squad.accent, 0.12) }}
                />
              ))}
            </div>
          ) : null}

          {stepId !== "review" ? (
            <div className="mb-4">
              <div className="text-[10px] font-black uppercase tracking-[0.24em]" style={{ color: squad.textFaint }}>
                {stepMeta.eyebrow}
              </div>
              <div className="mt-2 text-[1.55rem] font-black leading-none">{stepMeta.title}</div>
              <p className="mt-3 text-[12px] leading-relaxed" style={{ color: squad.textMuted }}>
                {stepMeta.body}
              </p>
            </div>
          ) : null}

          <div className="flex flex-1 flex-col justify-center">
            {stepId === "cin-front" ? (
              <CinCaptureStep side="front" previewUrl={frontPreviewUrl} onCapture={handleFrontCapture} onRetake={handleFrontRetake} />
            ) : null}
            {stepId === "cin-back" ? (
              <CinCaptureStep side="back" previewUrl={backPreviewUrl} onCapture={handleBackCapture} onRetake={handleBackRetake} />
            ) : null}
            {stepId === "selfie" ? (
              <SelfieCaptureStep previewUrl={selfieDataUrl} onCapture={setSelfieDataUrl} onRetake={() => setSelfieDataUrl(null)} />
            ) : null}
            {stepId === "review" ? (
              derivedStatus === "verified" ? (
                <div className="flex flex-col items-center justify-center gap-4 py-10 text-center">
                  <div className="flex size-16 items-center justify-center rounded-full" style={{ background: "rgba(19,154,99,0.12)", color: "#139A63" }}>
                    <CheckCircle2 className="size-8" />
                  </div>
                  <div>
                    <div className="text-[1.3rem] font-black">Identity verified</div>
                    <p className="mt-2 max-w-xs text-[12px] leading-relaxed" style={{ color: squad.textMuted }}>
                      Your CIN and selfie match. RIB linking and trusted routes are now unlocked.
                    </p>
                  </div>
                  <Link
                    href="/home"
                    className="flex w-full items-center justify-center gap-2 rounded-[18px] py-3.5 text-[14px] font-black"
                    style={{ background: squad.accent, color: "#FFFFFF" }}
                  >
                    Continue to dashboard
                    <ArrowRight className="size-4" />
                  </Link>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center gap-4 py-14 text-center">
                  <div
                    className="size-10 animate-spin rounded-full border-[3px]"
                    style={{ borderColor: alpha(squad.accent, 0.16), borderTopColor: squad.accent }}
                  />
                  <div className="text-[13px] font-black">Comparing your ID with your selfie...</div>
                  <p className="max-w-xs text-[11.5px] leading-relaxed" style={{ color: squad.textMuted }}>
                    This mock check only writes your verification status in Supabase - no photo leaves your device.
                  </p>
                </div>
              )
            ) : null}
          </div>

          {stepId === "intro" ? (
            <button
              type="button"
              onClick={goNext}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-[18px] py-3.5 text-[14px] font-black"
              style={{ background: squad.accent, color: "#FFFFFF", boxShadow: cardShadow }}
            >
              Start
              <ArrowRight className="size-4" />
            </button>
          ) : stepId === "cin-front" || stepId === "cin-back" || stepId === "selfie" ? (
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={goBack}
                className="flex flex-1 items-center justify-center gap-2 rounded-[18px] border py-3.5 text-[14px] font-black"
                style={{ borderColor: squad.border, color: squad.text }}
              >
                <ArrowLeft className="size-4" />
                Back
              </button>
              <button
                type="button"
                onClick={goNext}
                disabled={!canContinue}
                className="flex flex-1 items-center justify-center gap-2 rounded-[18px] py-3.5 text-[14px] font-black disabled:opacity-50"
                style={{ background: squad.accent, color: "#FFFFFF", boxShadow: cardShadow }}
              >
                Continue
                <ArrowRight className="size-4" />
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
