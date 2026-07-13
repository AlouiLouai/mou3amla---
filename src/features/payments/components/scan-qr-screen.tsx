"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, RefreshCw, Waves } from "lucide-react";
import { squad } from "@/features/squad/constants";
import type { UseSquadApp } from "@/features/squad/hooks/use-squad-app";

interface BarcodeDetectorLike {
  detect(source: CanvasImageSource): Promise<Array<{ rawValue: string }>>;
}

declare global {
  interface Window {
    BarcodeDetector?: new (options: { formats: string[] }) => BarcodeDetectorLike;
  }
}

export function ScanQrScreen({ squadApp }: { squadApp: UseSquadApp }) {
  const { state, actions } = squadApp;
  const { goHome, loadNearbyOptions, submitNearbyOption } = actions;
  const videoRef = useRef<HTMLVideoElement>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const supportsBarcodeDetector = typeof window !== "undefined" && "BarcodeDetector" in window;

  useEffect(() => {
    loadNearbyOptions();
  }, [loadNearbyOptions]);

  useEffect(() => {
    if (!supportsBarcodeDetector || !videoRef.current) return;

    let stream: MediaStream | null = null;
    let rafId: number | null = null;
    let cancelled = false;
    const video = videoRef.current;
    const detector = new window.BarcodeDetector!({ formats: ["qr_code"] });

    async function start() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        if (cancelled || !video) return;
        video.srcObject = stream;
        await video.play();
        scan();
      } catch {
        setCameraError("Camera unavailable - use the nearby code or paste the token below.");
      }
    }

    async function scan() {
      if (cancelled || !video) return;
      try {
        const results = await detector.detect(video);
        if (results.length > 0) {
          actions.submitScannedToken(results[0].rawValue);
          return;
        }
      } catch {
        // Detection can transiently fail between frames.
      }
      rafId = requestAnimationFrame(() => void scan());
    }

    void start();

    return () => {
      cancelled = true;
      if (rafId !== null) cancelAnimationFrame(rafId);
      stream?.getTracks().forEach((track) => track.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the camera loop is mounted once per screen entry
  }, [supportsBarcodeDetector]);

  return (
    <div className="flex flex-1 flex-col overflow-auto px-6 pt-[max(1.125rem,env(safe-area-inset-top))] pb-8">
      <button
        type="button"
        onClick={goHome}
        className="mb-4.5 flex size-9 items-center justify-center rounded-full border"
        style={{ background: squad.card, borderColor: squad.border }}
      >
        <ChevronLeft className="size-4" />
      </button>

      <div className="mb-1 text-[17px] font-extrabold tracking-tight">Find the recipient</div>
      <div className="mb-5 text-[13px] leading-relaxed" style={{ color: squad.textMuted }}>
        Use the nearby 3-digit code first, then fall back to camera scan or pasted SQUAD token.
      </div>

      <div
        className="mb-5 rounded-[26px] border p-4"
        style={{ background: squad.cardAlt, borderColor: squad.borderStrong }}
      >
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div
              className="flex size-9 items-center justify-center rounded-2xl"
              style={{ background: "rgba(255,0,131,0.12)", color: squad.accent }}
            >
              <Waves className="size-4.5" />
            </div>
            <div>
              <div className="text-[12px] font-black">Nearby match</div>
              <div className="text-[10.5px] font-medium" style={{ color: squad.textMuted }}>
                Ask the recipient which 3 digits they see, then pick it here.
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={loadNearbyOptions}
            className="flex items-center gap-1 rounded-full bg-white px-3 py-2 text-[10px] font-black uppercase tracking-[0.12em]"
            style={{ color: squad.accent }}
          >
            <RefreshCw className={`size-3 ${state.isLoadingNearbyOptions ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          {state.nearbyOptions.map((code) => (
            <button
              key={code}
              type="button"
              onClick={() => submitNearbyOption(code)}
              className="rounded-[20px] border bg-white px-4 py-4 text-center font-mono text-[1.4rem] font-black tracking-[0.24em] transition-transform active:scale-[0.98]"
              style={{ borderColor: squad.borderStrong, color: squad.hero }}
            >
              {code}
            </button>
          ))}
        </div>

        {state.nearbyOptions.length === 0 ? (
          <div className="mt-3 text-[11px] leading-relaxed" style={{ color: squad.textMuted }}>
            {state.isLoadingNearbyOptions
              ? "Looking for nearby users..."
              : "No active nearby code yet. Ask the recipient to open their receive screen and refresh."}
          </div>
        ) : null}
      </div>

      {supportsBarcodeDetector ? (
        <div
          className="relative mb-5 aspect-square w-full overflow-hidden rounded-[28px] border"
          style={{ background: "#0d0e12", borderColor: squad.border }}
        >
          <video ref={videoRef} muted playsInline className="size-full object-cover" />
          <div className="pointer-events-none absolute inset-8 rounded-2xl border-2" style={{ borderColor: squad.accent, opacity: 0.8 }} />
          {cameraError ? (
            <div
              className="absolute inset-0 flex items-center justify-center p-6 text-center text-[12.5px]"
              style={{ background: "rgba(255,255,255,0.88)", color: squad.textMuted }}
            >
              {cameraError}
            </div>
          ) : null}
        </div>
      ) : (
        <div
          className="mb-5 rounded-2xl border p-4 text-[12.5px] leading-relaxed"
          style={{ background: squad.card, borderColor: squad.border, color: squad.textMuted }}
        >
          Camera scanning isn&apos;t supported in this browser. Use the nearby code match or paste the signed token below.
        </div>
      )}

      <div className="mb-2 text-xs font-semibold tracking-wide" style={{ color: squad.textMuted }}>
        OR ENTER TOKEN MANUALLY
      </div>
      <div
        className="mb-4 flex items-center rounded-2xl border px-4 py-3"
        style={{ background: squad.card, borderColor: squad.borderStrong }}
      >
        <input
          value={state.scanManualInput}
          onChange={(e) => actions.onScanManualInputChange(e.target.value)}
          placeholder="Paste the signed SQUAD token"
          className="flex-1 border-none bg-transparent font-mono text-[13px] outline-none"
          style={{ color: squad.text }}
        />
      </div>
      <button
        type="button"
        onClick={actions.submitManualScanCode}
        disabled={!state.scanManualInput.trim()}
        className="rounded-2xl py-3.5 text-[15px] font-bold transition-opacity disabled:opacity-40"
        style={{ background: squad.accent, color: "#FFFFFF" }}
      >
        Continue
      </button>
    </div>
  );
}
