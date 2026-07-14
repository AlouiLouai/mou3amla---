"use client";

import Link from "next/link";
import { Clock3, Globe, ShieldCheck } from "lucide-react";
import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { formatPhoneForDisplay, formatUsernameHandle } from "@/features/auth/lib/identity";
import type { AuthFormState } from "@/features/auth/types";
import { verifyPhoneOtp } from "@/features/auth/server/actions";
import { alpha, cardShadow, squad } from "@/features/squad/constants";

const initialState: AuthFormState = {};

export function OtpScreen({ phone, username, demoOtp }: { phone: string; username: string; demoOtp: string | null }) {
  const verifyAction = verifyPhoneOtp.bind(null, phone, username, demoOtp);
  const [state, formAction, pending] = useActionState(verifyAction, initialState);
  const [otp, setOtp] = useState("");
  const [isAutofilling, startAutofill] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!demoOtp) return;

    const toastId = toast.success("Local OTP detected", {
      position: "top-center",
      description: `Tap to paste ${demoOtp} and continue instantly.`,
      duration: 15000,
      action: {
        label: "Use code",
        onClick: () => {
          startAutofill(() => {
            setOtp(demoOtp);
            setTimeout(() => {
              if (inputRef.current) {
                inputRef.current.value = demoOtp;
              }
              formRef.current?.requestSubmit();
            }, 0);
          });
        },
      },
    });

    return () => {
      toast.dismiss(toastId);
    };
  }, [demoOtp]);

  return (
    <div
      className="squad-viewport-h flex flex-1 flex-col justify-center px-5 py-[max(1.2rem,env(safe-area-inset-top))]"
      style={{ background: `linear-gradient(180deg, ${squad.surface} 0%, ${squad.bg} 100%)` }}
    >
      <div className="mx-auto flex w-full max-w-md flex-col">
        <div
          className="relative mb-4 overflow-hidden rounded-[30px] px-5 pt-5 pb-6 text-white"
          style={{ background: squad.hero, boxShadow: "0 26px 70px rgba(0,0,0,0.18)" }}
        >
          <div
            className="pointer-events-none absolute -top-12 right-[-26px] h-36 w-36 rounded-full"
            style={{ background: "linear-gradient(135deg, rgba(255,0,131,0.95), rgba(255,141,40,0.88))" }}
          />
          <div className="relative flex items-center justify-between">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.3em] text-white/60">Verification</div>
              <div className="mt-2 text-[1.85rem] font-black leading-none">Enter the 6-digit code.</div>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-white/14 bg-white/10 px-3 py-2 text-[12px] font-semibold text-white/84">
              <Globe className="size-4" />
              <span>FR</span>
            </div>
          </div>

          <div className="relative mt-5 flex items-center gap-3 rounded-[22px] bg-white px-4 py-3 text-black">
            <div
              className="flex size-11 items-center justify-center rounded-[16px]"
              style={{ background: alpha(squad.accent, 0.12), color: squad.accent }}
            >
              <ShieldCheck className="size-5" />
            </div>
            <div>
              <div className="text-[13px] font-black">OTP gate</div>
              <div className="text-[11px] leading-relaxed" style={{ color: squad.textMuted }}>
                +216 {formatPhoneForDisplay(phone)} for {formatUsernameHandle(username)}
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-[30px] border px-5 pt-5 pb-5" style={{ background: squad.card, borderColor: squad.border, boxShadow: cardShadow }}>
          <div className="mb-4 flex items-center gap-2">
            <Clock3 className="size-4" style={{ color: squad.subtle }} />
            <span className="text-[11px] font-black uppercase tracking-[0.22em]" style={{ color: squad.textFaint }}>
              Under one minute
            </span>
          </div>

          <form ref={formRef} action={formAction} className="space-y-4">
            <div>
              <label className="mb-2 block text-[11px] font-black uppercase tracking-[0.22em]" style={{ color: squad.textFaint }}>
                Verification code
              </label>
              <div className="rounded-[22px] border bg-white px-4 py-4" style={{ borderColor: squad.borderStrong }}>
                <input
                  autoFocus
                  ref={inputRef}
                  name="otp"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="123456"
                  value={otp}
                  onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))}
                  className="w-full border-none bg-transparent text-center font-mono text-[28px] font-black tracking-[0.42em] outline-none placeholder:text-slate-300"
                  style={{ color: squad.text }}
                />
              </div>
              {state?.errors?.otp?.map((error) => (
                <p key={error} className="mt-2 text-[11px]" style={{ color: squad.destructive }}>
                  {error}
                </p>
              ))}
            </div>

            {state?.message ? (
              <div
                className="rounded-[18px] border px-4 py-3 text-[12px] leading-relaxed"
                style={{ background: alpha(squad.destructive, 0.08), borderColor: alpha(squad.destructive, 0.22), color: squad.destructive }}
              >
                {state.message}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={pending || isAutofilling}
              className="w-full rounded-[18px] py-3.5 text-[15px] font-black transition-opacity disabled:opacity-60"
              style={{ background: squad.accent, color: "#FFFFFF", boxShadow: cardShadow }}
            >
              {pending || isAutofilling ? "Checking..." : "Verify and enter SQUAD"}
            </button>
          </form>

          <div className="mt-5 flex items-center justify-between text-[11px]" style={{ color: squad.textMuted }}>
            <Link href="/" className="font-black hover:opacity-80">
              Change identity
            </Link>
            <span>Code expires quickly.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
