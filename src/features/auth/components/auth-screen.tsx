"use client";

import { ArrowRight, Globe, ShieldCheck, Sparkles } from "lucide-react";
import { useActionState } from "react";
import type { AuthFormState } from "@/features/auth/types";
import { startPhoneAuth } from "@/features/auth/server/actions";
import { alpha, cardShadow, igGradient, mou3amla } from "@/features/mou3amla/constants";

const initialState: AuthFormState = {};

export function AuthScreen() {
  const [state, formAction, pending] = useActionState(startPhoneAuth, initialState);

  return (
    <div
      className="mou3amla-viewport-h flex flex-1 flex-col justify-center px-5 py-[max(1.2rem,env(safe-area-inset-top))]"
      style={{ background: `linear-gradient(180deg, ${mou3amla.surface} 0%, ${mou3amla.bg} 100%)`, color: mou3amla.text }}
    >
      <div className="mx-auto flex w-full max-w-md flex-col">
        <div
          className="relative mb-4 overflow-hidden rounded-[30px] px-5 pt-5 pb-6 text-white"
          style={{ background: mou3amla.hero, boxShadow: "0 26px 70px rgba(0,0,0,0.18)" }}
        >
          <div className="pointer-events-none absolute -top-14 right-[-28px] h-36 w-36 rounded-full opacity-80" style={{ background: igGradient }} />
          <div className="relative flex items-center justify-between">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.3em] text-white/60">Onboarding</div>
              <div className="mt-2 text-[1.95rem] font-black leading-none">One flow only.</div>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-white/14 bg-white/10 px-3 py-2 text-[12px] font-semibold text-white/84">
              <Globe className="size-4" />
              <span>FR</span>
            </div>
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
                Phone plus username
              </div>
              <div className="text-[11px] leading-relaxed" style={{ color: mou3amla.textMuted }}>
                No split between sign in and sign up. Enter both once and continue.
              </div>
            </div>
          </div>
        </div>

        <div
          className="rounded-[30px] border px-5 pt-5 pb-5"
          style={{ background: mou3amla.card, borderColor: mou3amla.border, boxShadow: cardShadow }}
        >
          <div className="mb-4 flex items-center gap-2">
            <Sparkles className="size-4" style={{ color: mou3amla.subtle }} />
            <span className="text-[11px] font-black uppercase tracking-[0.22em]" style={{ color: mou3amla.textFaint }}>
              Create or continue
            </span>
          </div>

          <div className="mb-4">
            <div className="text-[1.8rem] font-black leading-none">Start with your phone and your Mou3amla handle.</div>
            <p className="mt-3 text-[12px] leading-relaxed" style={{ color: mou3amla.textMuted }}>
              If we already know this pair, we ask for your passkey. If not, we create your unverified identity first and set up a passkey with the
              same gate.
            </p>
          </div>

          <form action={formAction} className="space-y-3.5">
            <div>
              <label className="mb-2 block text-[11px] font-black uppercase tracking-[0.22em]" style={{ color: mou3amla.textFaint }}>
                Phone number
              </label>
              <div
                className="flex items-center gap-3 rounded-[20px] border px-4 py-3.5"
                style={{ background: mou3amla.card, borderColor: mou3amla.borderStrong }}
              >
                <span className="text-[15px] font-black" style={{ color: mou3amla.accent }}>
                  +216
                </span>
                <div className="h-5 w-px" style={{ background: alpha(mou3amla.accent, 0.18) }} />
                <input
                  autoFocus
                  name="phone"
                  inputMode="numeric"
                  maxLength={8}
                  placeholder="20123456"
                  className="flex-1 border-none bg-transparent text-[15px] outline-none placeholder:text-white/30"
                  style={{ color: mou3amla.text }}
                />
              </div>
              {state?.errors?.phone?.map((error) => (
                <p key={error} className="mt-2 text-[11px]" style={{ color: mou3amla.destructive }}>
                  {error}
                </p>
              ))}
            </div>

            <div>
              <label className="mb-2 block text-[11px] font-black uppercase tracking-[0.22em]" style={{ color: mou3amla.textFaint }}>
                Username handle
              </label>
              <div
                className="flex items-center gap-3 rounded-[20px] border px-4 py-3.5"
                style={{ background: mou3amla.card, borderColor: mou3amla.borderStrong }}
              >
                <span className="text-[15px] font-black" style={{ color: mou3amla.accent }}>
                  @
                </span>
                <input
                  name="username"
                  maxLength={24}
                  placeholder="username"
                  className="flex-1 border-none bg-transparent text-[15px] lowercase outline-none placeholder:text-white/30"
                  style={{ color: mou3amla.text }}
                />
              </div>
              {state?.errors?.username?.map((error) => (
                <p key={error} className="mt-2 text-[11px]" style={{ color: mou3amla.destructive }}>
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
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-[18px] py-3.5 text-[15px] font-black transition-opacity disabled:opacity-60"
              style={{ background: mou3amla.accent, color: "#FFFFFF", boxShadow: cardShadow }}
            >
              <span>{pending ? "Preparing passkey..." : "Sign in"}</span>
              <ArrowRight className="size-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
