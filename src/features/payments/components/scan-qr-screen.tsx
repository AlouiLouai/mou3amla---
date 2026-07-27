"use client";

import { useState } from "react";
import { Waves } from "lucide-react";
import { HandoffModeToggle, type HandoffMode } from "@/features/payments/components/handoff-mode-toggle";
import { NearbyConnectPanel } from "@/features/payments/components/nearby-connect-panel";
import { ScanRoleSwitch } from "@/features/payments/components/scan-role-switch";
import { AppHeader } from "@/features/mou3amla/components/app-header";
import { renderAppFooter } from "@/features/mou3amla/components/bottom-nav";
import { ScreenFrame } from "@/features/mou3amla/components/screen-frame";
import { mou3amla } from "@/features/mou3amla/constants";
import type { UseMou3amlaApp } from "@/features/mou3amla/hooks/use-mou3amla-app";
import { useQrCameraScanner } from "@/features/payments/hooks/use-qr-camera-scanner";

export function ScanQrScreen({ mou3amlaApp }: { mou3amlaApp: UseMou3amlaApp }) {
  const { state, derived, actions } = mou3amlaApp;
  const { submitScannedToken } = actions;
  const [mode, setMode] = useState<HandoffMode>(state.initialHandoffMode);
  const header = (
    <AppHeader profile={derived.account.profile} unreadNotifications={derived.unreadNotifications} onNotifications={actions.goNotifications} />
  );
  const footer = renderAppFooter("scan-qr", actions);

  const {
    videoRef,
    cameraError,
    isSupported: supportsBarcodeDetector,
  } = useQrCameraScanner({ enabled: mode === "qr", onDetect: submitScannedToken });

  return (
    <ScreenFrame header={header} footer={footer} contentClassName="px-4 pb-8">
      <ScanRoleSwitch
        role="send"
        hideReceive={state.profile.accountType === "tourist"}
        onSelect={(role) => (role === "receive" ? actions.goReceiveQr() : undefined)}
      />
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
        <NearbyConnectPanel
          mou3amlaApp={mou3amlaApp}
          icon={<Waves className="size-4.5" />}
          title="Nearby match"
          subtitle="Ask the recipient which code they see, then pick it here. Uses your approximate location, if allowed, to only show codes nearby."
          idleHint="Ask the recipient to open their receive screen - this refreshes on its own."
        />
      )}
    </ScreenFrame>
  );
}
