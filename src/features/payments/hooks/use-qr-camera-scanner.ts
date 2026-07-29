"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";

interface BarcodeDetectorLike {
  detect(source: CanvasImageSource): Promise<Array<{ rawValue: string }>>;
}

declare global {
  interface Window {
    BarcodeDetector?: new (options: { formats: string[] }) => BarcodeDetectorLike;
  }
}

function subscribe() {
  return () => {};
}

function getSnapshot() {
  return "BarcodeDetector" in window;
}

function getServerSnapshot() {
  return false;
}

/** Drives the live camera QR-scan loop via the (Chromium-only) BarcodeDetector API. `isSupported` uses useSyncExternalStore, not a plain window check, to avoid a hydration mismatch. */
export function useQrCameraScanner({ enabled, onDetect }: { enabled: boolean; onDetect: (rawValue: string) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const isSupported = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useEffect(() => {
    if (!enabled || !isSupported || !videoRef.current) return;

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
          onDetect(results[0].rawValue);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the camera loop is mounted once per screen entry; callers pass a stable onDetect
  }, [enabled, isSupported]);

  return { videoRef, cameraError, isSupported };
}
