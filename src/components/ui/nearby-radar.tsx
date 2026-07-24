import type { ReactNode } from "react";
import { alpha, mou3amla } from "@/features/mou3amla/constants";

export interface RadarBlip {
  id: string;
  label: string;
  angle: number;
  distance: number;
  onClick?: () => void;
}

// Hand-rolled, not shadcn-generated - shared "radar" visual for every
// proximity-flavored moment in the app: the pre-signup sandbox preview
// (auth/components/proximity-sandbox-preview.tsx, entirely fake data) and
// the real authenticated nearby-handoff screens (receive-qr-screen.tsx,
// scan-qr-screen.tsx). One shared component means the pre-signup teaser and
// the real feature actually look like the same feature, not two unrelated
// visuals that happen to both say "nearby".
export function NearbyRadar({
  centerIcon,
  blips = [],
  size = 160,
  sweeping = true,
}: {
  centerIcon: ReactNode;
  blips?: RadarBlip[];
  size?: number;
  sweeping?: boolean;
}) {
  return (
    <div className="relative mx-auto flex shrink-0 items-center justify-center" style={{ width: size, height: size }}>
      {[1, 2, 3].map((ring) => (
        <div
          key={ring}
          className="absolute rounded-full border"
          style={{ borderColor: alpha(mou3amla.accent, 0.16), width: `${ring * 33}%`, height: `${ring * 33}%` }}
        />
      ))}
      {sweeping ? (
        <div
          className="absolute inset-0 animate-[mou3amla-radar-sweep_2.4s_linear_infinite] rounded-full"
          style={{ background: `conic-gradient(from 0deg, ${alpha(mou3amla.accent, 0.22)}, transparent 35%)` }}
          aria-hidden
        />
      ) : null}
      <div className="relative z-10 flex size-9 items-center justify-center rounded-full text-white" style={{ background: mou3amla.accent }}>
        {centerIcon}
      </div>
      {blips.map((blip) => {
        const radians = (blip.angle * Math.PI) / 180;
        const x = 50 + blip.distance * Math.cos(radians);
        const y = 50 + blip.distance * Math.sin(radians);
        return (
          <button
            key={blip.id}
            type="button"
            disabled={!blip.onClick}
            onClick={blip.onClick}
            className="absolute flex flex-col items-center gap-1 disabled:cursor-default"
            style={{ left: `${x}%`, top: `${y}%`, transform: "translate(-50%, -50%)" }}
          >
            <span className="relative flex size-3 items-center justify-center">
              <span className="absolute inline-flex size-full animate-ping rounded-full opacity-60" style={{ background: mou3amla.subtle }} />
              <span className="relative inline-flex size-2.5 rounded-full" style={{ background: mou3amla.subtle }} />
            </span>
            <span className="text-[9px] font-bold" style={{ color: mou3amla.textMuted }}>
              {blip.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// Deterministic pseudo-random angle/distance from a string (a nearby code,
// a username) so the same blip stays visually stable across re-renders
// instead of jittering to a new spot every poll.
export function hashToPolarPosition(seed: string): { angle: number; distance: number } {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return { angle: hash % 360, distance: 24 + (hash % 21) };
}
