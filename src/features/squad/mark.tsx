import { squad } from "@/features/squad/constants";

/**
 * The SQUAD brand mark (green rounded square + rotated outline square),
 * matching the logo drawn inline on the auth screen. Shared by the
 * next/og-generated icon routes under src/app/ so the app icon, apple-icon,
 * and manifest icons stay pixel-consistent with the in-app logo.
 */
export function SquadMark({ size }: { size: number }) {
  const innerSize = size * 0.41;
  const borderWidth = Math.max(1, size * 0.073);

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
          width: size * 0.74,
          height: size * 0.74,
          borderRadius: size * 0.19,
          background: squad.green,
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
            border: `${borderWidth}px solid #06110B`,
          }}
        />
      </div>
    </div>
  );
}
