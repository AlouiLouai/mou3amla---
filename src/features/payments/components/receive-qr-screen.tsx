"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Smartphone, User, Waves } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { QR_TOKEN_TTL_MS } from "@/features/payments/constants";
import { HandoffModeToggle, type HandoffMode } from "@/features/payments/components/handoff-mode-toggle";
import { NearbyConnecting } from "@/features/payments/components/nearby-connecting";
import { AppHeader } from "@/features/mou3amla/components/app-header";
import { renderAppFooter } from "@/features/mou3amla/components/bottom-nav";
import { ScreenFrame } from "@/features/mou3amla/components/screen-frame";
import { alpha, cardShadow, mou3amla } from "@/features/mou3amla/constants";
import type { UseMou3amlaApp } from "@/features/mou3amla/hooks/use-mou3amla-app";
import { statusToneColor } from "@/features/mou3amla/status-tone";
import { useNow } from "@/hooks/use-now";

function CountdownBadge({ expiresAt, totalMs }: { expiresAt: number; totalMs: number }) {
  const now = useNow(1000);
  const secondsLeft = Math.max(0, Math.ceil((expiresAt - now) / 1000));
  const progress = secondsLeft / (totalMs / 1000);

  return (
    <div className="mt-4 flex items-center gap-2">
      <div className="h-1 w-24 overflow-hidden rounded-full" style={{ background: alpha(mou3amla.accent, 0.12) }}>
        <div className="h-full rounded-full transition-all" style={{ width: `${progress * 100}%`, background: mou3amla.accent }} />
      </div>
      <span className="font-mono text-xs" style={{ color: mou3amla.textMuted }}>
        {secondsLeft}s
      </span>
    </div>
  );
}

function NearbyCountdown({ expiresAt }: { expiresAt: number }) {
  const now = useNow(1000);
  const secondsLeft = Math.max(0, Math.ceil((expiresAt - now) / 1000));

  return (
    <div className="font-mono text-[13px] font-bold" style={{ color: mou3amla.accent }}>
      {secondsLeft}s
    </div>
  );
}

export function ReceiveQrScreen({ mou3amlaApp }: { mou3amlaApp: UseMou3amlaApp }) {
  const { state, derived, actions } = mou3amlaApp;
  const { startQrRotation, startNearbyPublishRotation, startNearbyRealtime, acceptOwnerMatch, cancelOwnerMatch } = actions;
  const [mode, setMode] = useState<HandoffMode>(state.initialHandoffMode);
  const qrToken = state.qrToken;
  const nearbyHandoff = state.nearbyHandoff;
  const header = (
    <AppHeader
      profile={derived.account.profile}
      unreadNotifications={derived.unreadNotifications}
      onNotifications={actions.goNotifications}
    />
  );
  const footer = renderAppFooter("receive-qr", actions);

  useEffect(() => startQrRotation(), [startQrRotation]);
  useEffect(() => startNearbyPublishRotation(), [startNearbyPublishRotation]);
  useEffect(() => {
    if (mode !== "nearby") return;
    return startNearbyRealtime("owner");
  }, [mode, startNearbyRealtime]);

  return (
    <ScreenFrame header={header} footer={footer} contentClassName="px-6 pb-8">
      <div className="mb-3 text-center">
        <div className="text-[15px] font-black tracking-tight">Request a payment</div>
        <div className="mx-auto max-w-[280px] text-[12px] leading-relaxed" style={{ color: mou3amla.textMuted }}>
          Share your signed QR, or let a nearby payer match your code, AirDrop-style.
        </div>
      </div>
      <HandoffModeToggle mode={mode} onChange={setMode} />

      {mode === "qr" ? (
        <div className="flex flex-col items-center justify-center text-center">
          <div
            className="rounded-[28px] border p-4"
            style={{ background: mou3amla.card, borderColor: alpha(mou3amla.accent, 0.4), boxShadow: cardShadow }}
          >
            {qrToken ? (
              <QRCodeSVG value={qrToken.token} size={200} level="M" />
            ) : (
              <div className="flex size-[200px] items-center justify-center rounded-[18px]" style={{ background: mou3amla.cardAlt }}>
                <div className="text-center">
                  <div
                    className="mx-auto mb-3 size-8 animate-spin rounded-full border-[3px]"
                    style={{ borderColor: alpha(mou3amla.accent, 0.16), borderTopColor: mou3amla.accent }}
                  />
                  <div className="text-[12px] font-semibold" style={{ color: mou3amla.textMuted }}>
                    Minting secure QR
                  </div>
                </div>
              </div>
            )}
          </div>

          {qrToken ? (
            <CountdownBadge expiresAt={qrToken.expiresAt} totalMs={QR_TOKEN_TTL_MS} />
          ) : (
            <div className="mt-4 flex items-center gap-2">
              <div className="h-1 w-24 overflow-hidden rounded-full" style={{ background: alpha(mou3amla.accent, 0.12) }} />
              <span className="font-mono text-xs" style={{ color: mou3amla.textMuted }}>
                --
              </span>
            </div>
          )}
          <div className="mt-1 font-mono text-[11px]" style={{ color: mou3amla.textFaint }}>
            @{derived.account.profile.username}
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center text-center">
          <div
            className="mb-4 w-full rounded-[28px] border p-4 text-left"
            style={{ background: mou3amla.cardAlt, borderColor: alpha(mou3amla.accent, 0.22), boxShadow: cardShadow }}
          >
            <div className="mb-2 flex items-center gap-2">
              <div
                className="flex size-9 items-center justify-center rounded-2xl"
                style={{ background: alpha(mou3amla.accent, 0.12), color: mou3amla.accent }}
              >
                <Waves className="size-4.5" />
              </div>
              <div>
                <div className="text-[12px] font-black">Nearby handoff code</div>
                <div className="text-[10.5px] font-medium" style={{ color: mou3amla.textMuted }}>
                  Ask the payer to choose this code from 4 nearby options. Uses your approximate
                  location, if allowed, to only match with codes actually nearby.
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
                The payer is now finishing the payment on their phone. You&apos;ll get a notification once it&apos;s
                routed.
              </p>
            </div>
          ) : nearbyHandoff && nearbyHandoff.status === "matched" ? (
            <NearbyConnecting
              selfAccepted={nearbyHandoff.ownerAccepted}
              otherAccepted={nearbyHandoff.payerAccepted}
              selfIcon={<User className="size-5" />}
              otherIcon={<Smartphone className="size-5" />}
              title="A nearby phone wants to pay you"
              subtitle="Confirm on your side too - both phones need to accept before the code unlocks."
              acceptLabel="Accept this match"
              waitingLabel="Waiting for the other phone..."
              cancelLabel="Cancel and generate a new code"
              onAccept={acceptOwnerMatch}
              onCancel={cancelOwnerMatch}
            />
          ) : (
            <>
              <div className="relative mt-6 flex size-[100px] items-center justify-center">
                {[0, 0.6, 1.2].map((delay) => (
                  <div
                    key={delay}
                    className="absolute size-full animate-[mou3amla-pulse-ring_1.8s_ease-out_infinite] rounded-full border-2"
                    style={{ borderColor: mou3amla.subtle, animationDelay: `${delay}s` }}
                  />
                ))}
                <div
                  className="z-10 flex size-11 items-center justify-center rounded-full border"
                  style={{ background: mou3amla.card, borderColor: mou3amla.border }}
                >
                  <div className="size-3.5 rounded-full border-[2.2px]" style={{ borderColor: mou3amla.subtle }} />
                </div>
              </div>
              <div className="mt-3 max-w-[290px] text-[11.5px] leading-relaxed" style={{ color: mou3amla.textMuted }}>
                This is still a web-safe nearby simulation, not real BLE broadcasting. Both phones vibrate and must
                accept once a payer picks your code.
              </div>
            </>
          )}
        </div>
      )}
    </ScreenFrame>
  );
}
