"use client";

import { useEffect, type ReactNode } from "react";
import { CheckCircle2, Smartphone, User } from "lucide-react";
import { NearbyConnecting } from "@/features/payments/components/nearby-connecting";
import { NearbyRadar } from "@/components/ui/nearby-radar";
import { alpha, mou3amla } from "@/features/mou3amla/constants";
import type { UseMou3amlaApp } from "@/features/mou3amla/hooks/use-mou3amla-app";
import { BCT_SANDBOX_TEST_LIMIT_TND } from "@/features/payments/constants";
import { statusToneColor } from "@/features/mou3amla/status-tone";
import { useNow } from "@/hooks/use-now";

function NearbyCountdown({ expiresAt }: { expiresAt: number }) {
  const now = useNow(1000);
  const secondsLeft = Math.max(0, Math.ceil((expiresAt - now) / 1000));

  return (
    <div className="font-mono text-[13px] font-bold" style={{ color: mou3amla.accent }}>
      {secondsLeft}s
    </div>
  );
}

/** "Host a nearby code" panel - publishes a rotating code with an optional
 * amount (blank = "open", the guest fills it in after claiming - see
 * nearby-connect-panel.tsx). Used by the receive screen only. */
export function NearbyHostPanel({
  mou3amlaApp,
  icon,
  title,
  subtitle,
  broadcastingCopy,
  waitingTitle,
  waitingSubtitle,
}: {
  mou3amlaApp: UseMou3amlaApp;
  icon: ReactNode;
  title: string;
  subtitle: string;
  broadcastingCopy: string;
  waitingTitle: string;
  waitingSubtitle: string;
}) {
  const { state, actions } = mou3amlaApp;
  const { startNearbyPublishRotation, setNearbyHostAmount, commitNearbyHostAmount, startNearbyRealtime, acceptOwnerMatch, cancelOwnerMatch } = actions;
  const nearbyHandoff = state.nearbyHandoff;
  const nearbyHostAmount = state.nearbyHostAmount;

  useEffect(() => startNearbyPublishRotation(), [startNearbyPublishRotation]);
  useEffect(() => startNearbyRealtime("owner"), [startNearbyRealtime]);

  return (
    <div className="flex flex-col items-center justify-center text-center">
      <div
        className="mb-4 w-full rounded-[28px] border p-4 text-left"
        style={{ background: mou3amla.cardAlt, borderColor: alpha(mou3amla.accent, 0.22), boxShadow: "none" }}
      >
        <div className="mb-2 flex items-center gap-2">
          <div className="flex size-9 items-center justify-center rounded-2xl" style={{ background: alpha(mou3amla.accent, 0.12), color: mou3amla.accent }}>
            {icon}
          </div>
          <div>
            <div className="text-[12px] font-black">{title}</div>
            <div className="text-[10.5px] font-medium" style={{ color: mou3amla.textMuted }}>
              {subtitle}
            </div>
          </div>
        </div>

        <div className="mt-3 flex items-end justify-between gap-3">
          <div className="font-mono text-[1.85rem] font-black tracking-[0.16em]" style={{ color: mou3amla.accent }}>
            {nearbyHandoff?.code ?? "-----"}
          </div>
          <div className="text-right">
            <div className="text-[10px] font-semibold uppercase tracking-[0.16em]" style={{ color: mou3amla.textFaint }}>
              Expires
            </div>
            {nearbyHandoff ? (
              <NearbyCountdown expiresAt={nearbyHandoff.expiresAt} />
            ) : (
              <div className="font-mono text-[13px] font-bold" style={{ color: mou3amla.accent }}>
                --
              </div>
            )}
          </div>
        </div>

        <div className="mt-3 border-t pt-3" style={{ borderColor: mou3amla.border }}>
          {nearbyHandoff && nearbyHandoff.status !== "published" ? (
            <div className="flex items-center justify-between">
              <span className="text-[10.5px] font-semibold uppercase tracking-[0.14em]" style={{ color: mou3amla.textFaint }}>
                Amount
              </span>
              <span className="text-[13px] font-black" style={{ color: mou3amla.accent }}>
                {nearbyHandoff.amount !== null ? `${nearbyHandoff.amount.toFixed(3)} TND` : "Open - guest chooses"}
              </span>
            </div>
          ) : (
            <label className="flex items-center gap-2">
              <span className="text-[10.5px] font-semibold uppercase tracking-[0.14em]" style={{ color: mou3amla.textFaint }}>
                Amount
              </span>
              <input
                inputMode="decimal"
                value={nearbyHostAmount}
                onChange={(e) => setNearbyHostAmount(e.target.value)}
                onBlur={() => void commitNearbyHostAmount()}
                placeholder="Open (guest chooses)"
                className="min-w-0 flex-1 border-none bg-transparent text-right font-mono text-[13px] font-bold outline-none"
                style={{ color: mou3amla.text }}
              />
              <span className="text-[11px] font-semibold" style={{ color: mou3amla.textMuted }}>
                TND
              </span>
            </label>
          )}
          {!nearbyHandoff || nearbyHandoff.status === "published" ? (
            <p className="mt-1 text-right text-[9.5px] font-semibold" style={{ color: mou3amla.textFaint }}>
              BCT Test Limit: Max {BCT_SANDBOX_TEST_LIMIT_TND} TND - leave blank for an open payment
            </p>
          ) : null}
        </div>
      </div>

      {nearbyHandoff && nearbyHandoff.status === "confirmed" ? (
        <div
          className="w-full rounded-[24px] border p-4 text-left"
          style={{ background: alpha(statusToneColor("positive"), 0.08), borderColor: alpha(statusToneColor("positive"), 0.24) }}
        >
          <div className="flex items-center gap-2" style={{ color: statusToneColor("positive") }}>
            <CheckCircle2 className="size-5" />
            <span className="text-[13px] font-black">Matched!</span>
          </div>
          <p className="mt-1.5 text-[11.5px] leading-relaxed" style={{ color: mou3amla.textMuted }}>
            {waitingSubtitle}
          </p>
        </div>
      ) : nearbyHandoff && nearbyHandoff.status === "matched" ? (
        <NearbyConnecting
          selfAccepted={nearbyHandoff.ownerAccepted}
          otherAccepted={nearbyHandoff.payerAccepted}
          selfIcon={<User className="size-5" />}
          otherIcon={<Smartphone className="size-5" />}
          title={waitingTitle}
          subtitle="Confirm on your side too - both phones need to accept before the code unlocks."
          counterpartUsername={nearbyHandoff.counterpartUsername}
          acceptLabel="Accept this match"
          waitingLabel="Waiting for the other phone..."
          cancelLabel="Cancel and generate a new code"
          onAccept={acceptOwnerMatch}
          onCancel={cancelOwnerMatch}
        />
      ) : (
        <>
          <div className="mt-4">
            <NearbyRadar centerIcon={<User className="size-4" />} size={140} />
          </div>
          <div className="mt-3 max-w-[290px] text-[11.5px] leading-relaxed" style={{ color: mou3amla.textMuted }}>
            {broadcastingCopy}
          </div>
        </>
      )}
    </div>
  );
}
