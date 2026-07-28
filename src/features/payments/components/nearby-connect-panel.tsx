"use client";

import { useEffect, type ReactNode } from "react";
import { HandCoins, Smartphone, User } from "lucide-react";
import { hashToPolarPosition, NearbyRadar } from "@/components/ui/nearby-radar";
import { NearbyConnecting } from "@/features/payments/components/nearby-connecting";
import { alpha, mou3amla } from "@/features/mou3amla/constants";
import type { UseMou3amlaApp } from "@/features/mou3amla/hooks/use-mou3amla-app";
import { NEARBY_OPTIONS_REFRESH_MS } from "@/features/payments/constants";
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

/** "Browse and join a nearby code" panel - poll options, claim, mutual
 * accept. Used by the send screen only. */
export function NearbyConnectPanel({
  mou3amlaApp,
  icon,
  title,
  subtitle,
  idleHint,
}: {
  mou3amlaApp: UseMou3amlaApp;
  icon: ReactNode;
  title: string;
  subtitle: string;
  idleHint: string;
}) {
  const { state, actions } = mou3amlaApp;
  const { loadNearbyOptions, submitNearbyOption, acceptPayerMatch, cancelPayerMatch, expirePayerMatch, startNearbyRealtime } = actions;
  const payerMatch = state.payerMatch;

  // Re-polling well inside the host's own NEARBY_CODE_TTL_MS rotation window
  // keeps the grid current on its own - see NEARBY_OPTIONS_REFRESH_MS's own
  // comment in constants.ts for why this needs to be meaningfully faster
  // than that TTL, not just matched to it 1:1.
  useEffect(() => {
    if (payerMatch) return;

    loadNearbyOptions();
    const interval = setInterval(loadNearbyOptions, NEARBY_OPTIONS_REFRESH_MS);
    return () => clearInterval(interval);
  }, [payerMatch, loadNearbyOptions]);

  useEffect(() => startNearbyRealtime("payer"), [startNearbyRealtime]);

  // Realtime only reacts to a write (claim/accept/cancel) - a match nobody
  // acts on just goes stale past its own expiresAt with no event to catch.
  useEffect(() => {
    if (!payerMatch) return;
    const remaining = payerMatch.expiresAt - Date.now();
    if (remaining <= 0) {
      expirePayerMatch();
      return;
    }
    const timeout = setTimeout(expirePayerMatch, remaining);
    return () => clearTimeout(timeout);
  }, [payerMatch, expirePayerMatch]);

  return (
    <div className="rounded-[26px] border p-4" style={{ background: mou3amla.cardAlt, borderColor: mou3amla.borderStrong }}>
      <div className="mb-3 flex items-center gap-2">
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

      {payerMatch ? (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2 px-1">
            <div className="flex items-center gap-2">
              <HandCoins className="size-4.5" style={{ color: mou3amla.accent }} />
              <span className="text-[13px] font-black">
                Matched code {payerMatch.code}
                {payerMatch.amount !== null ? ` · ${payerMatch.amount.toFixed(3)} TND` : ""}
              </span>
            </div>
            <div className="text-right">
              <div className="text-[9px] font-semibold uppercase tracking-[0.14em]" style={{ color: mou3amla.textFaint }}>
                Expires
              </div>
              <NearbyCountdown expiresAt={payerMatch.expiresAt} />
            </div>
          </div>
          {/* No amount-entry gate here even when the host left the code
              "open" (payerMatch.amount === null) - accepting this match
              navigates straight to generate-intent-screen, where the amount
              is entered anyway. Asking for it here first would just be the
              same input twice. */}
          <NearbyConnecting
            selfAccepted={payerMatch.payerAccepted}
            otherAccepted={payerMatch.ownerAccepted}
            selfIcon={<User className="size-5" />}
            otherIcon={<Smartphone className="size-5" />}
            title="Connecting..."
            subtitle="Both phones vibrated - confirm on your side too. The recipient reveals once you both accept."
            counterpartUsername={payerMatch.counterpartUsername}
            acceptLabel="Accept this match"
            waitingLabel="Waiting for the other phone..."
            cancelLabel="Not this one? Cancel and pick another code"
            onAccept={acceptPayerMatch}
            onCancel={cancelPayerMatch}
          />
        </div>
      ) : state.hasLiveNearbyMatch ? (
        <div className="flex flex-col items-center gap-4">
          <NearbyRadar
            centerIcon={<User className="size-4" />}
            size={132}
            sweeping={false}
            blips={state.nearbyOptions.map((code) => ({ id: code, label: code, ...hashToPolarPosition(code) }))}
          />
          <div className="grid w-full grid-cols-2 gap-2.5">
            {state.nearbyOptions.map((code) => (
              <button
                key={code}
                type="button"
                onClick={() => submitNearbyOption(code)}
                className="rounded-[20px] border px-2 py-4 text-center font-mono text-[1.15rem] font-black tracking-[0.1em] transition-transform active:scale-[0.98]"
                style={{ background: mou3amla.card, borderColor: mou3amla.borderStrong, color: mou3amla.accent }}
              >
                {code}
              </button>
            ))}
          </div>
        </div>
      ) : (
        // No real code is currently published anywhere near this request -
        // the tappable grid above only ever renders when at least one option
        // is real (see hasLiveNearbyMatch). Showing placeholder/decoy digits
        // here instead would be indistinguishable from a real choice and
        // guaranteed to fail every tap.
        <div className="rounded-[20px] border border-dashed px-4 py-6 text-center" style={{ borderColor: mou3amla.borderStrong }}>
          <NearbyRadar centerIcon={<User className="size-4" />} size={120} />
          <div className="mt-3 text-[12.5px] font-bold" style={{ color: mou3amla.text }}>
            {state.isLoadingNearbyOptions ? "Looking for nearby codes..." : "No one's broadcasting a nearby code right now"}
          </div>
          <p className="mt-1 text-[11px] leading-relaxed" style={{ color: mou3amla.textMuted }}>
            {idleHint}
          </p>
        </div>
      )}
    </div>
  );
}
