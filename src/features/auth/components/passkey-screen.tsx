"use client";

import Link from "next/link";
import { Fingerprint, Globe, ShieldCheck } from "lucide-react";
import { useState, useTransition } from "react";
import { formatPhoneForDisplay, formatUsernameHandle } from "@/features/auth/lib/identity";
import { establishBridgeSession, finalizeAuth } from "@/features/auth/server/actions";
import { createClient } from "@/lib/supabase/client";
import { alpha, cardShadow, mou3amla } from "@/features/mou3amla/constants";

export function PasskeyScreen({ phone, username, mode }: { phone: string; username: string; mode: "register" | "authenticate" }) {
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startCeremony] = useTransition();

  const runCeremony = () => {
    setMessage(null);
    startCeremony(async () => {
      const supabase = createClient();

      if (mode === "register") {
        const bridge = await establishBridgeSession(phone, username);
        if (!bridge.ok) {
          setMessage(bridge.message ?? "We couldn't start passkey setup. Please retry.");
          return;
        }

        const { error } = await supabase.auth.registerPasskey();
        if (error) {
          setMessage("We couldn't create your passkey. Please try again on a device that supports Face ID, Touch ID, or Windows Hello.");
          return;
        }
      } else {
        const { error } = await supabase.auth.signInWithPasskey();
        if (error) {
          setMessage("We couldn't verify your passkey. Please try again.");
          return;
        }
      }

      const result = await finalizeAuth(phone, username);
      setMessage(result.message ?? "Something went wrong finishing sign-in. Please retry.");
    });
  };

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
            className="pointer-events-none absolute -top-12 right-[-26px] h-36 w-36 rounded-full"
            style={{ background: "linear-gradient(135deg, rgba(255,0,131,0.95), rgba(255,141,40,0.88))" }}
          />
          <div className="relative flex items-center justify-between">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.3em] text-white/60">Verification</div>
              <div className="mt-2 text-[1.85rem] font-black leading-none">
                {mode === "register" ? "Set up your passkey." : "Sign in with your passkey."}
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-white/14 bg-white/10 px-3 py-2 text-[12px] font-semibold text-white/84">
              <Globe className="size-4" />
              <span>FR</span>
            </div>
          </div>

          <div className="relative mt-5 flex items-center gap-3 rounded-[22px] bg-white px-4 py-3 text-black">
            <div
              className="flex size-11 items-center justify-center rounded-[16px]"
              style={{ background: alpha(mou3amla.accent, 0.12), color: mou3amla.accent }}
            >
              <ShieldCheck className="size-5" />
            </div>
            <div>
              <div className="text-[13px] font-black">Passkey gate</div>
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
              Face ID, Touch ID, or Windows Hello
            </span>
          </div>

          <p className="mb-4 text-[12px] leading-relaxed" style={{ color: mou3amla.textMuted }}>
            {mode === "register"
              ? "No SMS code needed. Your device creates a private key that only unlocks with your biometrics."
              : "Use the passkey saved on this device to open your Mou3amla session."}
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
            <span>{pending ? "Waiting for biometrics..." : mode === "register" ? "Create passkey" : "Continue with passkey"}</span>
          </button>

          <div className="mt-5 flex items-center justify-between text-[11px]" style={{ color: mou3amla.textMuted }}>
            <Link href="/" className="font-black hover:opacity-80">
              Change identity
            </Link>
            <span>No password stored, ever.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
