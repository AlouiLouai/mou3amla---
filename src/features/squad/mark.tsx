import { squad } from "@/features/squad/constants";

/**
 * The SQUAD brand mark (white rounded square + rotated outline square),
 * matching the logo drawn inline on the auth screen. Shared by the
 * next/og-generated icon routes under src/app/ so the app icon, apple-icon,
 * and manifest icons stay pixel-consistent with the in-app logo.
 *
 * `maskable` shrinks the badge so its corners stay inside the ~40%-radius
 * safe-zone circle Android's adaptive-icon spec masks content to (some
 * launchers - including plain circular masks - crop anything outside it;
 * the default 0.74 badge's corners sit outside that circle).
 */
export function SquadMark({ size, maskable = false }: { size: number; maskable?: boolean }) {
  const badgeScale = maskable ? 0.52 : 0.74;
  const badgeSize = size * badgeScale;
  const innerSize = badgeSize * 0.55;
  const borderWidth = Math.max(1, badgeSize * 0.1);

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: squad.bg,
      }}
    >
      <div
        style={{
          width: badgeSize,
          height: badgeSize,
          borderRadius: badgeSize * 0.26,
          background: squad.accent,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            width: innerSize,
            height: innerSize,
            transform: "rotate(45deg)",
            borderRadius: size * 0.03,
            border: `${borderWidth}px solid ${squad.bg}`,
          }}
        />
      </div>
    </div>
  );
}
