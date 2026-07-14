"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { RotateCcw, ScanFace } from "lucide-react";
import { alpha, squad } from "@/features/squad/constants";

interface DetectedFaceLike {
  boundingBox: { x: number; y: number; width: number; height: number };
}

interface FaceDetectorLike {
  detect(source: CanvasImageSource): Promise<DetectedFaceLike[]>;
}

declare global {
  interface Window {
    FaceDetector?: new (options?: { fastMode?: boolean; maxDetectedFaces?: number }) => FaceDetectorLike;
  }
}

const ALIGNED_FRAMES_REQUIRED = 6;
const FALLBACK_CAPTURE_MS = 2600;

function isFaceAligned(box: DetectedFaceLike["boundingBox"], videoWidth: number, videoHeight: number): boolean {
  if (!videoWidth || !videoHeight) return false;
  const centerX = (box.x + box.width / 2) / videoWidth;
  const centerY = (box.y + box.height / 2) / videoHeight;
  const heightRatio = box.height / videoHeight;
  return centerX > 0.3 && centerX < 0.7 && centerY > 0.2 && centerY < 0.65 && heightRatio > 0.3 && heightRatio < 0.85;
}

interface SelfieCaptureStepProps {
  previewUrl: string | null;
  onCapture: (dataUrl: string) => void;
  onRetake: () => void;
}

export function SelfieCaptureStep({ previewUrl, onCapture, onRetake }: SelfieCaptureStepProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [statusLabel, setStatusLabel] = useState("Starting camera...");
  const [isAligned, setIsAligned] = useState(false);
  const [retryToken, setRetryToken] = useState(0);
  const supportsFaceDetector = typeof window !== "undefined" && "FaceDetector" in window;

  const capture = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !video.videoWidth) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    onCapture(canvas.toDataURL("image/jpeg", 0.9));
  }, [onCapture]);

  useEffect(() => {
    if (previewUrl) return;
    const video = videoRef.current;
    if (!video) return;

    let stream: MediaStream | null = null;
    let rafId: number | null = null;
    let fallbackTimer: ReturnType<typeof setTimeout> | null = null;
    let cancelled = false;
    let alignedFrames = 0;
    const detector = supportsFaceDetector ? new window.FaceDetector!({ fastMode: true, maxDetectedFaces: 1 }) : null;

    async function scan() {
      if (cancelled || !video || !detector) return;

      try {
        const faces = await detector.detect(video);
        const aligned = faces.some((face) => isFaceAligned(face.boundingBox, video.videoWidth, video.videoHeight));
        alignedFrames = aligned ? alignedFrames + 1 : 0;
        setIsAligned((prev) => (prev === aligned ? prev : aligned));

        if (alignedFrames >= ALIGNED_FRAMES_REQUIRED) {
          capture();
          return;
        }
      } catch {
        // Detection can transiently fail between frames.
      }

      rafId = requestAnimationFrame(() => void scan());
    }

    async function start() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
        if (cancelled || !video) return;
        video.srcObject = stream;
        await video.play();
        if (cancelled) return;

        if (detector) {
          setStatusLabel("Center your face inside the circle");
          scan();
        } else {
          setStatusLabel("Hold still, capturing shortly...");
          fallbackTimer = setTimeout(() => {
            if (!cancelled) capture();
          }, FALLBACK_CAPTURE_MS);
        }
      } catch {
        if (!cancelled) setCameraError("Camera unavailable. Check permissions and try again.");
      }
    }

    void start();

    return () => {
      cancelled = true;
      if (rafId !== null) cancelAnimationFrame(rafId);
      if (fallbackTimer) clearTimeout(fallbackTimer);
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, [previewUrl, supportsFaceDetector, capture, retryToken]);

  return (
    <div
      className="rounded-[28px] border p-4"
      style={{ background: squad.hero, borderColor: "transparent", boxShadow: "0 26px 70px rgba(0,0,0,0.16)" }}
    >
      <div className="mb-4 flex items-center justify-between text-white/72">
        <div className="text-[11px] font-black uppercase tracking-[0.2em]">Selfie match</div>
        <ScanFace className="size-5" />
      </div>

      {previewUrl ? (
        <div>
          <div className="overflow-hidden rounded-[24px] border border-white/12">
            {/* eslint-disable-next-line @next/next/no-img-element -- transient local capture preview, not an optimizable served asset */}
            <img src={previewUrl} alt="Selfie capture" className="aspect-[3/4] w-full object-cover" />
          </div>
          <button
            type="button"
            onClick={onRetake}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-[18px] border border-white/16 py-3 text-[13px] font-black text-white"
          >
            <RotateCcw className="size-4" />
            Retake
          </button>
        </div>
      ) : (
        <div>
          <div className="relative mx-auto aspect-[3/4] w-full max-w-[280px] overflow-hidden rounded-[24px]" style={{ background: "#0d0e12" }}>
            <video ref={videoRef} muted playsInline className="size-full object-cover" style={{ transform: "scaleX(-1)" }} />
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div
                className="rounded-[50%] border-[3px] transition-colors duration-300"
                style={{
                  width: "64%",
                  height: "76%",
                  borderColor: isAligned ? "#1DAA62" : alpha(squad.subtle, 0.9),
                  boxShadow: "0 0 0 2000px rgba(5,5,5,0.5)",
                }}
              />
            </div>
            {cameraError ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center" style={{ background: "rgba(5,5,5,0.88)" }}>
                <div className="text-[12.5px] leading-relaxed text-white/80">{cameraError}</div>
                <button
                  type="button"
                  onClick={() => {
                    setCameraError(null);
                    setRetryToken((token) => token + 1);
                  }}
                  className="rounded-full px-4 py-2 text-[11px] font-black text-white"
                  style={{ background: squad.accent }}
                >
                  Try again
                </button>
              </div>
            ) : null}
          </div>

          <div className="mt-3 text-center text-[12px] font-semibold text-white/80">{statusLabel}</div>

          {!cameraError ? (
            <button
              type="button"
              onClick={capture}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-[18px] py-3.5 text-[14px] font-black"
              style={{ background: "#FFFFFF", color: squad.hero }}
            >
              Capture now
            </button>
          ) : null}
        </div>
      )}

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
