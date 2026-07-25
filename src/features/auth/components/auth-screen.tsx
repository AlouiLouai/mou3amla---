"use client";

import { useActionState, useState } from "react";
import { Globe } from "lucide-react";
import type { AuthFormState } from "@/features/auth/types";
import { startPhoneAuth } from "@/features/auth/server/actions";
import { LogoLockup } from "@/features/mou3amla/components/logo-lockup";
import { alpha, mou3amla } from "@/features/mou3amla/constants";
import { LanguageSheet } from "@/features/i18n/components/language-sheet";
import { useTranslation } from "@/features/i18n/language-store";
import { OnboardingStepper } from "@/features/auth/components/onboarding-stepper";
import { ProximitySandboxPreview } from "@/features/auth/components/proximity-sandbox-preview";

const initialState: AuthFormState = {};

export function AuthScreen() {
  const [state, formAction, pending] = useActionState(startPhoneAuth, initialState);
  const [languageSheetOpen, setLanguageSheetOpen] = useState(false);
  const { t, language } = useTranslation();

  return (
    // `dark` is applied here deliberately, independent of the app's
    // light/dark setting: this is the pre-authentication brand arrival
    // moment (paired with the splash screen and passkey-screen), and it
    // stays permanently dark-branded rather than following a preference the
    // user hasn't had a chance to set yet - see globals.css's :root/.dark
    // comment.
    <div
      className="dark mou3amla-viewport-h flex flex-1 flex-col justify-center px-6 py-[max(1.2rem,env(safe-area-inset-top))]"
      style={{ background: mou3amla.bg, color: mou3amla.text }}
    >
      <div className="mx-auto flex w-full max-w-sm flex-col">
        {/* Same stepper + language row shape as ProfileBuilderScreen and
            PasskeyScreen, in the same position relative to the top of the
            screen, so the 3-step flow reads as one continuous journey
            instead of three differently-composed screens. */}
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex-1">
            <OnboardingStepper currentStep={1} labels={[t("onboarding.step.device"), t("onboarding.step.profile"), t("onboarding.step.passkey")]} />
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

        <div className="mb-6 flex justify-center">
          <LogoLockup tagline={t("auth.tagline")} />
        </div>

        <ProximitySandboxPreview
          teaserLabel={t("onboarding.radar.teaser")}
          disclaimerLabel={t("onboarding.radar.disclaimer")}
          peerLabel={t("onboarding.radar.peers")}
        />

        <form action={formAction} className="space-y-3">
          <div>
            <div
              className="flex items-center gap-3 rounded-full border px-4 py-3.5"
              style={{ background: mou3amla.cardAlt, borderColor: mou3amla.borderStrong }}
            >
              <span className="text-[14px] font-black" style={{ color: mou3amla.accent }}>
                +216
              </span>
              <div className="h-5 w-px" style={{ background: alpha(mou3amla.accent, 0.18) }} />
              <input
                autoFocus
                name="phone"
                inputMode="numeric"
                maxLength={8}
                placeholder={t("auth.phonePlaceholder")}
                className="flex-1 border-none bg-transparent text-[14px] outline-none placeholder:text-white/30"
                style={{ color: mou3amla.text }}
              />
            </div>
            {state?.errors?.phone?.map((error) => (
              <p key={error} className="mt-2 px-1 text-[11px]" style={{ color: mou3amla.destructive }}>
                {error}
              </p>
            ))}
          </div>

          <div>
            <div
              className="flex items-center gap-3 rounded-full border px-4 py-3.5"
              style={{ background: mou3amla.cardAlt, borderColor: mou3amla.borderStrong }}
            >
              <span className="text-[14px] font-black" style={{ color: mou3amla.accent }}>
                @
              </span>
              <input
                name="username"
                maxLength={24}
                placeholder={t("auth.usernamePlaceholder")}
                className="flex-1 border-none bg-transparent text-[14px] lowercase outline-none placeholder:text-white/30"
                style={{ color: mou3amla.text }}
              />
            </div>
            {state?.errors?.username?.map((error) => (
              <p key={error} className="mt-2 px-1 text-[11px]" style={{ color: mou3amla.destructive }}>
                {error}
              </p>
            ))}
          </div>

          {state?.message ? (
            <div
              className="rounded-[18px] border px-4 py-3 text-[12px] leading-relaxed"
              style={{ background: alpha(mou3amla.destructive, 0.08), borderColor: alpha(mou3amla.destructive, 0.22), color: mou3amla.destructive }}
            >
              {state.message}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-full py-3.5 text-center text-[15px] font-black transition-opacity disabled:opacity-60"
            style={{ background: mou3amla.accent, color: "#FFFFFF" }}
          >
            {pending ? t("auth.preparingPasskey") : t("auth.signIn")}
          </button>
        </form>

        <div className="my-5 flex items-center gap-3">
          <div className="h-px flex-1" style={{ background: mou3amla.border }} />
          <span className="text-[10px] font-black tracking-[0.2em]" style={{ color: mou3amla.textFaint }}>
            {t("auth.or")}
          </span>
          <div className="h-px flex-1" style={{ background: mou3amla.border }} />
        </div>

        <p className="text-center text-[11.5px] leading-relaxed" style={{ color: mou3amla.textMuted }}>
          {t("auth.knownPairPrefix")}{" "}
          <span className="font-bold" style={{ color: mou3amla.accent }}>
            {t("auth.passkey")}
          </span>
          {t("auth.knownPairSuffix")}
        </p>
      </div>

      <LanguageSheet open={languageSheetOpen} onClose={() => setLanguageSheetOpen(false)} />
    </div>
  );
}
