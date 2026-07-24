"use client";

import { useEffect, useState } from "react";
import { HandCoins, RefreshCw, Smartphone, User, Waves } from "lucide-react";
import { HandoffModeToggle, type HandoffMode } from "@/features/payments/components/handoff-mode-toggle";
import { NearbyConnecting } from "@/features/payments/components/nearby-connecting";
import { AppHeader } from "@/features/mou3amla/components/app-header";
import { renderAppFooter } from "@/features/mou3amla/components/bottom-nav";
import { ScreenFrame } from "@/features/mou3amla/components/screen-frame";
import { alpha, mou3amla } from "@/features/mou3amla/constants";
import type { UseMou3amlaApp } from "@/features/mou3amla/hooks/use-mou3amla-app";
import { NEARBY_OPTIONS_REFRESH_MS } from "@/features/payments/constants";
import { useQrCameraScanner } from "@/features/payments/hooks/use-qr-camera-scanner";
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

export function ScanQrScreen({ mou3amlaApp }: { mou3amlaApp: UseMou3amlaApp }) {
  const { state, derived, actions } = mou3amlaApp;
  const { loadNearbyOptions, submitNearbyOption, acceptPayerMatch, cancelPayerMatch, expirePayerMatch, startNearbyRealtime, submitScannedToken } = actions;
  const [mode, setMode] = useState<HandoffMode>(state.initialHandoffMode);
  const payerMatch = state.payerMatch;
  const header = (
    <AppHeader profile={derived.account.profile} unreadNotifications={derived.unreadNotifications} onNotifications={actions.goNotifications} />
  );
  const footer = renderAppFooter("scan-qr", actions);

  // The owner's code rotates every QR_TOKEN_TTL_MS (60s) on its own timer,
  // unsynced with when the payer happened to load this screen - a one-shot
  // fetch here would silently go stale (showing a code that already
  // rotated away) until the payer noticed and tapped "Refresh" manually.
  // Re-polling well inside that 60s window keeps it current on its own.
  useEffect(() => {
    if (mode !== "nearby" || payerMatch) return;

    loadNearbyOptions();
    const interval = setInterval(loadNearbyOptions, NEARBY_OPTIONS_REFRESH_MS);
    return () => clearInterval(interval);
  }, [mode, payerMatch, loadNearbyOptions]);

  useEffect(() => {
    if (mode !== "nearby") return;
    return startNearbyRealtime("payer");
  }, [mode, startNearbyRealtime]);

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

  const {
    videoRef,
    cameraError,
    isSupported: supportsBarcodeDetector,
  } = useQrCameraScanner({ enabled: mode === "qr", onDetect: submitScannedToken });

  return (
    <ScreenFrame header={header} footer={footer} contentClassName="px-6 pb-8">
      <div className="mb-3">
        <div className="text-[15px] font-black tracking-tight">Find the recipient</div>
        <div className="text-[12px] leading-relaxed" style={{ color: mou3amla.textMuted }}>
          Scan their signed QR, or use the nearby code instead, AirDrop-style.
        </div>
      </div>
      <HandoffModeToggle mode={mode} onChange={setMode} />

      {mode === "qr" ? (
        <>
          {supportsBarcodeDetector ? (
            <div
              className="relative mb-5 aspect-square w-full overflow-hidden rounded-[28px] border"
              style={{ background: mou3amla.hero, borderColor: mou3amla.border }}
            >
              <video ref={videoRef} muted playsInline className="size-full object-cover" />
              <div className="pointer-events-none absolute inset-8 rounded-2xl border-2" style={{ borderColor: mou3amla.accent, opacity: 0.8 }} />
              {cameraError ? (
                <div
                  className="absolute inset-0 flex items-center justify-center p-6 text-center text-[12.5px]"
                  style={{ background: "rgba(0,0,0,0.88)", color: mou3amla.textMuted }}
                >
                  {cameraError}
                </div>
              ) : null}
            </div>
          ) : (
            <div
              className="mb-5 rounded-2xl border p-4 text-[12.5px] leading-relaxed"
              style={{ background: mou3amla.card, borderColor: mou3amla.border, color: mou3amla.textMuted }}
            >
              Camera scanning isn&apos;t supported in this browser. Use the nearby code or paste the signed token
              below.
            </div>
          )}

          <div className="mb-2 text-xs font-semibold tracking-wide" style={{ color: mou3amla.textMuted }}>
            OR ENTER TOKEN MANUALLY
          </div>
          <div
            className="mb-4 flex items-center rounded-2xl border px-4 py-3"
            style={{ background: mou3amla.card, borderColor: mou3amla.borderStrong }}
          >
            <input
              value={state.scanManualInput}
              onChange={(e) => actions.onScanManualInputChange(e.target.value)}
              placeholder="Paste the signed Mou3amla token"
              className="flex-1 border-none bg-transparent font-mono text-[13px] outline-none"
              style={{ color: mou3amla.text }}
            />
          </div>
          <button
            type="button"
            onClick={actions.submitManualScanCode}
            disabled={!state.scanManualInput.trim()}
            className="w-full rounded-2xl py-3.5 text-center text-[15px] font-bold transition-opacity disabled:opacity-40"
            style={{ background: mou3amla.accent, color: "#FFFFFF" }}
          >
            Continue
          </button>
        </>
      ) : (
        <div
          className="mb-5 rounded-[26px] border p-4"
          style={{ background: mou3amla.cardAlt, borderColor: mou3amla.borderStrong }}
        >
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div
                className="flex size-9 items-center justify-center rounded-2xl"
                style={{ background: alpha(mou3amla.accent, 0.12), color: mou3amla.accent }}
              >
                <Waves className="size-4.5" />
              </div>
              <div>
                <div className="text-[12px] font-black">Nearby match</div>
                <div className="text-[10.5px] font-medium" style={{ color: mou3amla.textMuted }}>
                  Ask the recipient which code they see, then pick it here. Uses your
                  approximate location, if allowed, to only show codes nearby.
                </div>
              </div>
            </div>

            {!payerMatch ? (
              <button
                type="button"
                onClick={loadNearbyOptions}
                className="flex items-center gap-1 rounded-full px-3 py-2 text-[10px] font-black uppercase tracking-[0.12em]"
                style={{ background: mou3amla.card, color: mou3amla.accent }}
              >
                <RefreshCw className={`size-3 ${state.isLoadingNearbyOptions ? "animate-spin" : ""}`} />
                Refresh
              </button>
            ) : null}
          </div>

          {payerMatch ? (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between gap-2 px-1">
                <div className="flex items-center gap-2">
                  <HandCoins className="size-4.5" style={{ color: mou3amla.accent }} />
                  <span className="text-[13px] font-black">Matched code {payerMatch.code}</span>
                </div>
                <div className="text-right">
                  <div className="text-[9px] font-semibold uppercase tracking-[0.14em]" style={{ color: mou3amla.textFaint }}>
                    Expires
                  </div>
                  <NearbyCountdown expiresAt={payerMatch.expiresAt} />
                </div>
              </div>
              <NearbyConnecting
                selfAccepted={payerMatch.payerAccepted}
                otherAccepted={payerMatch.ownerAccepted}
                selfIcon={<User className="size-5" />}
                otherIcon={<Smartphone className="size-5" />}
                title="Connecting..."
                subtitle="Both phones vibrated - confirm on your side too. The recipient reveals once you both accept."
                acceptLabel="Accept this match"
                waitingLabel="Waiting for the other phone..."
                cancelLabel="Not this one? Cancel and pick another code"
                onAccept={acceptPayerMatch}
                onCancel={cancelPayerMatch}
              />
            </div>
          ) : state.hasLiveNearbyMatch ? (
            <div className="grid grid-cols-2 gap-2.5">
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
          ) : (
            // No real code is currently published anywhere near this
            // request - the 4-code grid above only ever renders when at
            // least one option is real (see hasLiveNearbyMatch). Showing
            // placeholder/decoy digits here instead would be indistinguishable
            // from a real choice and guaranteed to fail every tap.
            <div
              className="rounded-[20px] border border-dashed px-4 py-6 text-center"
              style={{ borderColor: mou3amla.borderStrong, color: mou3amla.textMuted }}
            >
              <div className="text-[12.5px] font-bold" style={{ color: mou3amla.text }}>
                {state.isLoadingNearbyOptions ? "Looking for nearby codes..." : "No one's broadcasting a nearby code right now"}
              </div>
              <p className="mt-1 text-[11px] leading-relaxed">
                Ask the recipient to open their receive screen, then tap Refresh.
              </p>
            </div>
          )}
        </div>
      )}
    </ScreenFrame>
  );
}
