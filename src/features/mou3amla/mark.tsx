import { igGradient } from "@/features/mou3amla/constants";

/**
 * The Mou3amla brand mark: the same gradient-ring "m" badge drawn inline by
 * LogoLockup (auth screen / splash screen), reproduced here for the
 * next/og-generated icon routes under src/app/ so the browser tab icon and
 * installed-PWA icon stay pixel-consistent with the in-app logo instead of
 * silently drifting from it.
 *
 * Deliberately uses fixed hex values, not `mou3amla.*` tokens: this renders
 * through next/og's Satori engine (a static server-side layout renderer),
 * which has no DOM/CSSOM and can't resolve `var(--mou3amla-*)` - and an app
 * icon should look identical regardless of the viewer's light/dark
 * preference anyway, same reasoning as the pre-auth brand shell staying
 * fixed-dark (see docs/05-styling-ui.md).
 *
 * `maskable` shrinks the badge so it stays inside the ~66%-diameter
 * safe-zone Android's adaptive-icon spec masks content to (some launchers
 * crop anything outside it, and mask shapes vary - circle, squircle,
 * rounded square).
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
