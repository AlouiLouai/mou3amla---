"use client";

import { useState, useTransition } from "react";
import { Check, Globe } from "lucide-react";
import { formatUsernameHandle } from "@/features/auth/lib/identity";
import { setProfileCardGradient } from "@/features/auth/server/actions";
import { OnboardingStepper } from "@/features/auth/components/onboarding-stepper";
import { IdentityCardPreview } from "@/features/auth/components/identity-card-preview";
import { LanguageSheet } from "@/features/i18n/components/language-sheet";
import { useTranslation } from "@/features/i18n/language-store";
import { alpha, cardShadow, identityGradients, mou3amla, type IdentityGradientId } from "@/features/mou3amla/constants";

// IKEA Effect: the user already claimed `username` in Stage 1
// (startPhoneAuth's createIdentity runs before this ever renders - see
// docs/06-conventions.md auth conventions). This step asks them to invest a
// little more - pick a card style - before the passkey ceremony, raising
// perceived ownership of the profile they're about to lock in. Register mode
// only; a returning user signing in again doesn't get this step.
export function ProfileBuilderScreen({ phone, username, onContinue }: { phone: string; username: string; onContinue: () => void }) {
  const [gradient, setGradient] = useState<IdentityGradientId>("cyan");
  const [pending, startSaving] = useTransition();
  const [languageSheetOpen, setLanguageSheetOpen] = useState(false);
  const { t, language } = useTranslation();

  const gradientLabels: Record<IdentityGradientId, string> = {
    cyan: t("onboarding.builder.cyan"),
    magenta: t("onboarding.builder.magenta"),
    amber: t("onboarding.builder.amber"),
    emerald: t("onboarding.builder.emerald"),
  };

  const handleContinue = () => {
    startSaving(async () => {
      await setProfileCardGradient(phone, username, gradient);
      onContinue();
    });
  };

  return (
    <div
      className="dark mou3amla-viewport-h flex flex-1 flex-col justify-center px-5 py-[max(1.2rem,env(safe-area-inset-top))]"
      style={{ background: `linear-gradient(180deg, ${mou3amla.surface} 0%, ${mou3amla.bg} 100%)` }}
    >
      <div className="mx-auto flex w-full max-w-md flex-col">
        {/* Same row shape as AuthScreen and PasskeyScreen - see the comment
            in auth-screen.tsx. */}
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex-1">
            <OnboardingStepper currentStep={2} labels={[t("onboarding.step.device"), t("onboarding.step.profile"), t("onboarding.step.passkey")]} />
          </div>
          <button
            type="button"
            onClick={() => setLanguageSheetOpen(true)}
            className="flex shrink-0 items-center gap-2 rounded-full border border-white/14 bg-white/10 px-3 py-2 text-[12px] font-semibold text-white/84"
          >
            <Globe className="size-4" />
            <span>{language.toUpperCase()}</span>
          </button>
        </div>

        <div className="rounded-[30px] border px-5 pt-5 pb-5" style={{ background: mou3amla.card, borderColor: mou3amla.border, boxShadow: cardShadow }}>
          <div
            className="mb-4 rounded-[18px] border px-4 py-3 text-[12px] leading-relaxed"
            style={{ background: alpha(mou3amla.accent, 0.08), borderColor: alpha(mou3amla.accent, 0.22), color: mou3amla.text }}
          >
            {t("onboarding.builder.claimedPrefix")}
            <span className="font-black" style={{ color: mou3amla.accent }}>
              {formatUsernameHandle(username)}
            </span>
            {t("onboarding.builder.claimedSuffix")}
          </div>

          <div className="mb-1 text-[1.4rem] font-black leading-tight" style={{ color: mou3amla.text }}>
            {t("onboarding.builder.heading")}
          </div>
          <p className="mb-4 text-[12px] leading-relaxed" style={{ color: mou3amla.textMuted }}>
            {t("onboarding.builder.subtitle")}
          </p>

          <IdentityCardPreview username={username} gradientId={gradient} memberLabel={t("onboarding.builder.member")} />

          <div className="mt-4 grid grid-cols-2 gap-2.5">
            {(Object.keys(identityGradients) as IdentityGradientId[]).map((id) => {
              const option = identityGradients[id];
              const selected = gradient === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setGradient(id)}
                  className="flex items-center gap-2.5 rounded-[16px] border px-3 py-2.5 transition-colors"
                  style={{ borderColor: selected ? option.solid : mou3amla.border, background: selected ? alpha(option.solid, 0.1) : "transparent" }}
                >
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full" style={{ background: option.gradient }}>
                    {selected ? <Check className="size-3.5 text-white" /> : null}
                  </span>
                  <span className="text-[12px] font-black" style={{ color: mou3amla.text }}>
                    {gradientLabels[id]}
                  </span>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={handleContinue}
            disabled={pending}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-[18px] py-3.5 text-[15px] font-black transition-opacity disabled:opacity-60"
            style={{ background: mou3amla.accent, color: "#FFFFFF", boxShadow: cardShadow }}
          >
            {t("onboarding.builder.continue")}
          </button>
        </div>
      </div>

      <LanguageSheet open={languageSheetOpen} onClose={() => setLanguageSheetOpen(false)} />
    </div>
  );
}
