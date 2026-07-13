import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { ChevronLeft } from "lucide-react";
import { alpha, cardShadow, squad } from "@/features/squad/constants";
import type { UseSquadApp } from "@/features/squad/hooks/use-squad-app";
import { encodeQrToken, QR_TOKEN_TTL_MS } from "@/features/payments/lib/qr-token";

function useNow(intervalMs: number): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

export function ReceiveQrScreen({ squadApp }: { squadApp: UseSquadApp }) {
  const { state, derived, actions } = squadApp;
  const now = useNow(1000);

  useEffect(() => actions.startQrRotation(), [actions]);

  if (!state.qrToken) return null;

  const secondsLeft = Math.max(0, Math.ceil((state.qrToken.expiresAt - now) / 1000));
  const progress = secondsLeft / (QR_TOKEN_TTL_MS / 1000);

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

      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <div className="mb-1 text-[17px] font-extrabold tracking-tight">Request a payment</div>
        <div className="mb-6 max-w-[260px] text-[13px] leading-relaxed" style={{ color: squad.textMuted }}>
          Show this to the payer, or let their phone discover you nearby.
        </div>

        <div
          className="rounded-[28px] border p-4"
          style={{ background: "#ffffff", borderColor: alpha(squad.accent, 0.4), boxShadow: cardShadow }}
        >
          <QRCodeSVG value={encodeQrToken(state.qrToken)} size={200} level="M" />
        </div>

        <div className="mt-4 flex items-center gap-2">
          <div className="h-1 w-24 overflow-hidden rounded-full" style={{ background: "rgba(255,255,255,0.1)" }}>
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${progress * 100}%`, background: squad.accent }}
            />
          </div>
          <span className="font-mono text-xs" style={{ color: squad.textMuted }}>
            {secondsLeft}s
          </span>
        </div>
        <div className="mt-1 font-mono text-[11px]" style={{ color: squad.textFaint }}>
          @{derived.account.profile.username}
        </div>

        <div className="relative mt-10 flex size-[100px] items-center justify-center">
          {[0, 0.6, 1.2].map((delay) => (
            <div
              key={delay}
              className="absolute size-full animate-[squad-pulse-ring_1.8s_ease-out_infinite] rounded-full border-2"
              style={{ borderColor: squad.subtle, animationDelay: `${delay}s` }}
            />
          ))}
          <div
            className="z-10 flex size-11 items-center justify-center rounded-full border"
            style={{ background: squad.bg, borderColor: squad.border }}
          >
            <div className="size-3.5 rounded-full border-[2.2px]" style={{ borderColor: squad.subtle }} />
          </div>
        </div>
        <div className="mt-3 text-[11.5px]" style={{ color: squad.textMuted }}>
          Broadcasting nearby (simulated) — real BLE discovery needs the
          native app.
        </div>
      </div>
    </div>
  );
}
