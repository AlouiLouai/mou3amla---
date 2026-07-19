"use client";

import { useActionState } from "react";
import type { AuthFormState } from "@/features/auth/types";
import { startPhoneAuth } from "@/features/auth/server/actions";
import { LogoLockup } from "@/features/mou3amla/components/logo-lockup";
import { alpha, mou3amla } from "@/features/mou3amla/constants";

const initialState: AuthFormState = {};

export function AuthScreen() {
  const [state, formAction, pending] = useActionState(startPhoneAuth, initialState);

  return (
    <div
      className="mou3amla-viewport-h flex flex-1 flex-col justify-center px-6 py-[max(1.2rem,env(safe-area-inset-top))]"
      style={{ background: mou3amla.bg, color: mou3amla.text }}
    >
      <div className="mx-auto flex w-full max-w-sm flex-col">
        <div className="mb-8 flex justify-center">
          <LogoLockup tagline="Your @username is your bank route. That's it." />
        </div>

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
                placeholder="Phone number"
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
                placeholder="username handle"
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
            {pending ? "Preparing passkey..." : "Sign in"}
          </button>
        </form>

        <div className="my-5 flex items-center gap-3">
          <div className="h-px flex-1" style={{ background: mou3amla.border }} />
          <span className="text-[10px] font-black tracking-[0.2em]" style={{ color: mou3amla.textFaint }}>
            OR
          </span>
          <div className="h-px flex-1" style={{ background: mou3amla.border }} />
        </div>

        <p className="text-center text-[11.5px] leading-relaxed" style={{ color: mou3amla.textMuted }}>
          If we already know this pair, we ask for your{" "}
          <span className="font-bold" style={{ color: mou3amla.accent }}>
            passkey
          </span>
          . If not, we create your identity in seconds.
        </p>
      </div>
    </div>
  );
}
