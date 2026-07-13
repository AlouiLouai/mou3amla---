"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft } from "lucide-react";
import { squad } from "@/features/squad/constants";
import type { UseSquadApp } from "@/features/squad/hooks/use-squad-app";

// `BarcodeDetector` is a Chrome/Edge/Android Web API — not in the DOM lib
// types yet, and not available on Safari (manual entry covers that case).
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
  const videoRef = useRef<HTMLVideoElement>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const supportsBarcodeDetector = typeof window !== "undefined" && "BarcodeDetector" in window;

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
        setCameraError("Camera unavailable — use the code entry below instead.");
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
        // Detection can transiently fail between frames — keep scanning.
      }
      rafId = requestAnimationFrame(() => void scan());
    }

    void start();

    return () => {
      cancelled = true;
      if (rafId !== null) cancelAnimationFrame(rafId);
      stream?.getTracks().forEach((track) => track.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs the scan loop once per screen mount
  }, [supportsBarcodeDetector]);

  return (
    <div className="flex flex-1 flex-col overflow-auto px-6 pt-[max(1.125rem,env(safe-area-inset-top))] pb-8">
      <button
        type="button"
        onClick={actions.goHome}
        className="mb-4.5 flex size-9 items-center justify-center rounded-full border"
        style={{ background: squad.card, borderColor: squad.border }}
      >
        <ChevronLeft className="size-4" />
      </button>

      <div className="mb-1 text-[17px] font-extrabold tracking-tight">Scan to pay</div>
      <div className="mb-5 text-[13px] leading-relaxed" style={{ color: squad.textMuted }}>
        Point your camera at the recipient&apos;s SQUAD QR code.
      </div>

      {supportsBarcodeDetector ? (
        <div
          className="relative mb-5 aspect-square w-full overflow-hidden rounded-[28px] border"
          style={{ background: "#0d0e12", borderColor: squad.border }}
        >
          <video ref={videoRef} muted playsInline className="size-full object-cover" />
          <div className="pointer-events-none absolute inset-8 rounded-2xl border-2" style={{ borderColor: squad.accent, opacity: 0.8 }} />
          {cameraError && (
            <div
              className="absolute inset-0 flex items-center justify-center p-6 text-center text-[12.5px]"
              style={{ background: "rgba(11,12,16,0.85)", color: squad.textMuted }}
            >
              {cameraError}
            </div>
          )}
        </div>
      ) : (
        <div
          className="mb-5 rounded-2xl border p-4 text-[12.5px] leading-relaxed"
          style={{ background: squad.card, borderColor: squad.border, color: squad.textMuted }}
        >
          Camera scanning isn&apos;t supported in this browser. Ask the
          recipient to read out their code, or paste it below.
        </div>
      )}

      <div className="mb-2 text-xs font-semibold tracking-wide" style={{ color: squad.textMuted }}>
        OR ENTER CODE MANUALLY
      </div>
      <div
        className="mb-4 flex items-center rounded-2xl border px-4 py-3"
        style={{ background: squad.card, borderColor: squad.borderStrong }}
      >
        <input
          value={state.scanManualInput}
          onChange={(e) => actions.onScanManualInputChange(e.target.value)}
          placeholder="Paste SQUAD code"
          className="flex-1 border-none bg-transparent font-mono text-[13px] outline-none"
          style={{ color: squad.text }}
        />
      </div>
      <button
        type="button"
        onClick={actions.submitManualScanCode}
        disabled={!state.scanManualInput.trim()}
        className="rounded-2xl py-3.5 text-[15px] font-bold transition-opacity disabled:opacity-40"
        style={{ background: squad.accent, color: squad.bg }}
      >
        Continue
      </button>
    </div>
  );
}
