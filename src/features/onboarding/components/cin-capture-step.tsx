"use client";

import { useRef } from "react";
import type { ChangeEvent } from "react";
import { Camera, RotateCcw } from "lucide-react";
import { alpha, cardShadow, squad } from "@/features/squad/constants";

interface CinCaptureStepProps {
  side: "front" | "back";
  previewUrl: string | null;
  onCapture: (file: File) => void;
  onRetake: () => void;
}

export function CinCaptureStep({ side, previewUrl, onCapture, onRetake }: CinCaptureStepProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const label = side === "front" ? "Front of your CIN" : "Back of your CIN";

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) onCapture(file);
    event.target.value = "";
  }

  return (
    <div className="rounded-[28px] border bg-white p-4" style={{ borderColor: squad.border, boxShadow: cardShadow }}>
      <div className="mb-4 flex items-center justify-between text-[11px] font-black uppercase tracking-[0.18em]" style={{ color: squad.textFaint }}>
        <span>{label}</span>
        <span>{previewUrl ? "Captured" : "Required"}</span>
      </div>

      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleChange} />

      {previewUrl ? (
        <div>
          <div
            className="overflow-hidden rounded-[22px] border"
            style={{ borderColor: alpha(squad.accent, 0.18), minHeight: 190 }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- transient local blob preview, not an optimizable served asset */}
            <img src={previewUrl} alt={label} className="max-h-[280px] w-full object-contain bg-black/5" />
          </div>
          <button
            type="button"
            onClick={onRetake}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-[18px] border py-3 text-[13px] font-black"
            style={{ borderColor: squad.border, color: squad.text }}
          >
            <RotateCcw className="size-4" />
            Retake
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex w-full flex-col items-center justify-center gap-3 rounded-[22px] border border-dashed py-10 text-center"
          style={{ borderColor: alpha(squad.accent, 0.3), background: alpha(squad.accent, 0.05) }}
        >
          <div className="flex size-12 items-center justify-center rounded-full" style={{ background: alpha(squad.accent, 0.12), color: squad.accent }}>
            <Camera className="size-5" />
          </div>
          <div className="text-[13px] font-black">Tap to take a photo or choose from your library</div>
          <div className="max-w-[220px] text-[11px] leading-relaxed" style={{ color: squad.textMuted }}>
            Keep all four edges of the card visible and avoid glare.
          </div>
        </button>
      )}
    </div>
  );
}
