import { useEffect, useState } from "react";
import { ChevronLeft, Waves } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { QR_TOKEN_TTL_MS } from "@/features/payments/constants";
import { alpha, cardShadow, squad } from "@/features/squad/constants";
import type { UseSquadApp } from "@/features/squad/hooks/use-squad-app";

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
  const { startQrRotation, goHome } = actions;
  const qrToken = state.qrToken;
  const nearbyHandoff = state.nearbyHandoff;

  useEffect(() => startQrRotation(), [startQrRotation]);

  const secondsLeft = qrToken ? Math.max(0, Math.ceil((qrToken.expiresAt - now) / 1000)) : 0;
  const nearbySecondsLeft = nearbyHandoff ? Math.max(0, Math.ceil((nearbyHandoff.expiresAt - now) / 1000)) : 0;
  const progress = qrToken ? secondsLeft / (QR_TOKEN_TTL_MS / 1000) : 0;

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

      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <div className="mb-1 text-[17px] font-extrabold tracking-tight">Request a payment</div>
        <div className="mb-5 max-w-[280px] text-[13px] leading-relaxed" style={{ color: squad.textMuted }}>
          Nearby users can match your 3-digit code, or they can still scan the signed SQUAD QR.
        </div>

        <div
          className="mb-4 w-full rounded-[28px] border p-4 text-left"
          style={{ background: squad.cardAlt, borderColor: alpha(squad.accent, 0.22), boxShadow: cardShadow }}
        >
          <div className="mb-2 flex items-center gap-2">
            <div
              className="flex size-9 items-center justify-center rounded-2xl"
              style={{ background: alpha(squad.accent, 0.12), color: squad.accent }}
            >
              <Waves className="size-4.5" />
            </div>
            <div>
              <div className="text-[12px] font-black">Nearby handoff code</div>
              <div className="text-[10.5px] font-medium" style={{ color: squad.textMuted }}>
                Ask the payer to choose this code from 4 nearby options.
              </div>
            </div>
          </div>

          <div className="mt-3 flex items-end justify-between gap-3">
            <div className="font-mono text-[2.3rem] font-black tracking-[0.26em]" style={{ color: squad.hero }}>
              {nearbyHandoff?.code ?? "---"}
            </div>
            <div className="text-right">
              <div className="text-[10px] font-semibold uppercase tracking-[0.16em]" style={{ color: squad.textFaint }}>
                Expires
              </div>
              <div className="font-mono text-[13px] font-bold" style={{ color: squad.accent }}>
                {nearbyHandoff ? `${nearbySecondsLeft}s` : "--"}
              </div>
            </div>
          </div>
        </div>

        <div
          className="rounded-[28px] border p-4"
          style={{ background: squad.card, borderColor: alpha(squad.accent, 0.4), boxShadow: cardShadow }}
        >
          {qrToken ? (
            <QRCodeSVG value={qrToken.token} size={200} level="M" />
          ) : (
            <div className="flex size-[200px] items-center justify-center rounded-[18px]" style={{ background: squad.cardAlt }}>
              <div className="text-center">
                <div
                  className="mx-auto mb-3 size-8 animate-spin rounded-full border-[3px]"
                  style={{ borderColor: alpha(squad.accent, 0.16), borderTopColor: squad.accent }}
                />
                <div className="text-[12px] font-semibold" style={{ color: squad.textMuted }}>
                  Minting secure QR
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="mt-4 flex items-center gap-2">
          <div className="h-1 w-24 overflow-hidden rounded-full" style={{ background: alpha(squad.accent, 0.12) }}>
            <div className="h-full rounded-full transition-all" style={{ width: `${progress * 100}%`, background: squad.accent }} />
          </div>
          <span className="font-mono text-xs" style={{ color: squad.textMuted }}>
            {qrToken ? `${secondsLeft}s` : "--"}
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
            style={{ background: squad.card, borderColor: squad.border }}
          >
            <div className="size-3.5 rounded-full border-[2.2px]" style={{ borderColor: squad.subtle }} />
          </div>
        </div>
        <div className="mt-3 max-w-[290px] text-[11.5px] leading-relaxed" style={{ color: squad.textMuted }}>
          This is still a web-safe nearby simulation, not real BLE broadcasting. Once matched, the final payment still
          uses the same TUNPAY intent handoff.
        </div>
      </div>
    </div>
  );
}
