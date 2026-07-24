"use client";

import Link from "next/link";
import { Fingerprint, Globe, ShieldCheck } from "lucide-react";
import { useState, useTransition } from "react";
import { startAuthentication, startRegistration } from "@simplewebauthn/browser";
import { formatPhoneForDisplay, formatUsernameHandle } from "@/features/auth/lib/identity";
import {
  getPasskeyAuthenticationOptions,
  getPasskeyRegistrationOptions,
  logPasskeyCeremonyFailure,
  verifyPasskeyAuthentication,
  verifyPasskeyRegistration,
} from "@/features/auth/server/actions";
import { alpha, cardShadow, igGradient, mou3amla } from "@/features/mou3amla/constants";
import { LanguageSheet } from "@/features/i18n/components/language-sheet";
import { useTranslation } from "@/features/i18n/language-store";

export function PasskeyScreen({ phone, username, mode }: { phone: string; username: string; mode: "register" | "authenticate" }) {
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startCeremony] = useTransition();
  const [languageSheetOpen, setLanguageSheetOpen] = useState(false);
  const { t, language } = useTranslation();

  const runCeremony = () => {
    setMessage(null);
    startCeremony(async () => {
      if (mode === "register") {
        const optionsResult = await getPasskeyRegistrationOptions(phone, username);
        if (!optionsResult.ok) {
          setMessage(optionsResult.message);
          return;
        }

        let response;
        try {
          response = await startRegistration({ optionsJSON: optionsResult.options });
        } catch (error) {
          void logPasskeyCeremonyFailure("register", error instanceof Error ? `${error.name}: ${error.message}` : String(error));
          setMessage("We couldn't create your passkey. Please try again on a device that supports Face ID, Touch ID, or Windows Hello.");
          return;
        }

        const result = await verifyPasskeyRegistration(phone, username, response);
        if (result) {
          setMessage(result.message);
        }
      } else {
        const optionsResult = await getPasskeyAuthenticationOptions(phone, username);
        if (!optionsResult.ok) {
          setMessage(optionsResult.message);
          return;
        }

        let response;
        try {
          response = await startAuthentication({ optionsJSON: optionsResult.options });
        } catch (error) {
          void logPasskeyCeremonyFailure("authenticate", error instanceof Error ? `${error.name}: ${error.message}` : String(error));
          setMessage("We couldn't verify your passkey. Please try again.");
          return;
        }

        const result = await verifyPasskeyAuthentication(phone, username, response);
        if (result) {
          setMessage(result.message);
        }
      }
    });
  };

  return (
    <div
      className="dark mou3amla-viewport-h flex flex-1 flex-col justify-center px-5 py-[max(1.2rem,env(safe-area-inset-top))]"
      style={{ background: `linear-gradient(180deg, ${mou3amla.surface} 0%, ${mou3amla.bg} 100%)` }}
      // See auth-screen.tsx: `dark` here is deliberate, not a preference
      // toggle - the pre-authentication brand shell stays permanently dark.
    >
      <div className="mx-auto flex w-full max-w-md flex-col">
        <div
          className="relative mb-4 overflow-hidden rounded-[30px] px-5 pt-5 pb-6 text-white"
          style={{ background: mou3amla.hero, boxShadow: "0 26px 70px rgba(0,0,0,0.18)" }}
        >
          <div className="pointer-events-none absolute -top-12 right-[-26px] h-36 w-36 rounded-full opacity-80" style={{ background: igGradient }} />
          <div className="relative flex items-center justify-between">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.3em] text-white/60">{t("passkey.verification")}</div>
              <div className="mt-2 text-[1.85rem] font-black leading-none">
                {mode === "register" ? t("passkey.headingRegister") : t("passkey.headingAuthenticate")}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setLanguageSheetOpen(true)}
              className="flex items-center gap-2 rounded-full border border-white/14 bg-white/10 px-3 py-2 text-[12px] font-semibold text-white/84"
            >
              <Globe className="size-4" />
              <span>{language.toUpperCase()}</span>
            </button>
          </div>

          <div className="relative mt-5 flex items-center gap-3 rounded-[22px] px-4 py-3" style={{ background: mou3amla.card }}>
            <div
              className="flex size-11 items-center justify-center rounded-[16px]"
              style={{ background: alpha(mou3amla.accent, 0.12), color: mou3amla.accent }}
            >
              <ShieldCheck className="size-5" />
            </div>
            <div>
              <div className="text-[13px] font-black" style={{ color: mou3amla.text }}>
                {t("passkey.gate")}
              </div>
              <div className="text-[11px] leading-relaxed" style={{ color: mou3amla.textMuted }}>
                +216 {formatPhoneForDisplay(phone)} for {formatUsernameHandle(username)}
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-[30px] border px-5 pt-5 pb-5" style={{ background: mou3amla.card, borderColor: mou3amla.border, boxShadow: cardShadow }}>
          <div className="mb-4 flex items-center gap-2">
            <Fingerprint className="size-4" style={{ color: mou3amla.subtle }} />
            <span className="text-[11px] font-black uppercase tracking-[0.22em]" style={{ color: mou3amla.textFaint }}>
              {t("passkey.biometricLabel")}
            </span>
          </div>

          <p className="mb-4 text-[12px] leading-relaxed" style={{ color: mou3amla.textMuted }}>
            {mode === "register" ? t("passkey.bodyRegister") : t("passkey.bodyAuthenticate")}
          </p>

          {message ? (
            <div
              className="mb-4 rounded-[18px] border px-4 py-3 text-[12px] leading-relaxed"
              style={{ background: alpha(mou3amla.destructive, 0.08), borderColor: alpha(mou3amla.destructive, 0.22), color: mou3amla.destructive }}
            >
              {message}
            </div>
          ) : null}

          <button
            type="button"
            onClick={runCeremony}
            disabled={pending}
            className="flex w-full items-center justify-center gap-2 rounded-[18px] py-3.5 text-[15px] font-black transition-opacity disabled:opacity-60"
            style={{ background: mou3amla.accent, color: "#FFFFFF", boxShadow: cardShadow }}
          >
            <Fingerprint className="size-4" />
            <span>{pending ? t("passkey.waiting") : mode === "register" ? t("passkey.createPasskey") : t("passkey.continueWithPasskey")}</span>
          </button>

          <div className="mt-5 flex items-center justify-between text-[11px]" style={{ color: mou3amla.textMuted }}>
            <Link href="/" className="font-black hover:opacity-80">
              {t("passkey.changeIdentity")}
            </Link>
            <span>{t("passkey.noPasswordStored")}</span>
          </div>
        </div>
      </div>

      <LanguageSheet open={languageSheetOpen} onClose={() => setLanguageSheetOpen(false)} />
    </div>
  );
}
