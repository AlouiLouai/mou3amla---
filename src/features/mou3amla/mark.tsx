import { igGradient } from "@/features/mou3amla/constants";

/**
 * The Mou3amla brand mark (same gradient-ring "m" as LogoLockup), reproduced
 * for next/og's icon routes so the tab/PWA icon stays pixel-consistent.
 * Uses fixed hex, not `mou3amla.*` tokens - Satori has no DOM/CSSOM and
 * can't resolve CSS vars. `maskable` shrinks the badge to fit Android's
 * adaptive-icon safe zone.
 */
export function Mou3amlaMark({ size, maskable = false }: { size: number; maskable?: boolean }) {
  const badgeScale = maskable ? 0.6 : 1;
  const badgeSize = size * badgeScale;
  const ringWidth = Math.max(1, badgeSize * 0.045);
  const innerSize = badgeSize - ringWidth * 2;

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#000000",
      }}
    >
      <div
        style={{
          width: badgeSize,
          height: badgeSize,
          borderRadius: badgeSize / 2,
          background: igGradient,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            width: innerSize,
            height: innerSize,
            borderRadius: innerSize / 2,
            background: "#0A0A0A",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <span
            style={{
              fontSize: innerSize * 0.52,
              fontWeight: 900,
              color: "#FFFFFF",
              lineHeight: 1,
            }}
          >
            m
          </span>
        </div>
      </div>
    </div>
  );
}
