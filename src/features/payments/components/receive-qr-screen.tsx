"use client";

import { useEffect, useState } from "react";
import { Waves } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { QR_TOKEN_TTL_MS } from "@/features/payments/constants";
import { HandoffModeToggle, type HandoffMode } from "@/features/payments/components/handoff-mode-toggle";
import { NearbyHostPanel } from "@/features/payments/components/nearby-host-panel";
import { ScanRoleSwitch } from "@/features/payments/components/scan-role-switch";
import { AppHeader } from "@/features/mou3amla/components/app-header";
import { renderAppFooter } from "@/features/mou3amla/components/bottom-nav";
import { ScreenFrame } from "@/features/mou3amla/components/screen-frame";
import { alpha, cardShadow, mou3amla } from "@/features/mou3amla/constants";
import type { UseMou3amlaApp } from "@/features/mou3amla/hooks/use-mou3amla-app";
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

export function ReceiveQrScreen({ mou3amlaApp }: { mou3amlaApp: UseMou3amlaApp }) {
  const { state, derived, actions } = mou3amlaApp;
  const { startQrRotation } = actions;
  const [mode, setMode] = useState<HandoffMode>(state.initialHandoffMode);
  const qrToken = state.qrToken;
  const header = (
    <AppHeader
      profile={derived.account.profile}
      unreadNotifications={derived.unreadNotifications}
      onNotifications={actions.goNotifications}
    />
  );
  const footer = renderAppFooter("receive-qr", actions);

  useEffect(() => startQrRotation(), [startQrRotation]);

  return (
    <ScreenFrame header={header} footer={footer} contentClassName="px-4 pb-8">
      <ScanRoleSwitch role="receive" onSelect={(role) => (role === "send" ? actions.goScanQr() : undefined)} />
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
        <NearbyHostPanel
          mou3amlaApp={mou3amlaApp}
          icon={<Waves className="size-4.5" />}
          title="Nearby handoff code"
          subtitle="Ask the payer to choose this code from 4 nearby options. Uses your approximate location, if allowed, to only match with codes actually nearby."
          broadcastingCopy="You're broadcasting - this is still a web-safe nearby simulation, not real BLE broadcasting. Both phones vibrate and must accept once a payer picks your code."
          waitingTitle="A nearby phone wants to pay you"
          waitingSubtitle="The payer is now finishing the payment on their phone. You'll get a notification once it's routed."
        />
      )}
    </ScreenFrame>
  );
}
