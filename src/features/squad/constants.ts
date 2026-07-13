// SQUAD's palette: a fixed, deliberately monochrome dark theme — true black
// background, white text, white primary UI — in the spirit of Instagram's
// iOS dark mode. Independent of the app's light/dark shadcn theme, which
// this feature doesn't use (see docs/05-styling-ui.md).
//
// This file is intentionally just design tokens — provider/wallet brand
// colors live in src/features/wallets/constants.ts, not here. Those DO stay
// colorful (each linked account keeps its own brand tint) the same way
// Instagram's chrome is black/white but avatars/photos aren't.
export const squad = {
  bg: "#000000",
  surface: "#000000",
  card: "#1A1A1A",
  cardAlt: "#262626",
  border: "rgba(255,255,255,0.1)",
  borderStrong: "rgba(255,255,255,0.2)",
  text: "#FFFFFF",
  textMuted: "rgba(255,255,255,0.55)",
  textFaint: "rgba(255,255,255,0.35)",
  /** Primary interactive color — buttons, links, active states. White, not a brand hue. */
  accent: "#FFFFFF",
  /** iOS system-gray — secondary badges/emphasis (Pro, sandbox notice, etc.). */
  subtle: "#8E8E93",
  /** Reserved for destructive actions only (Log Out, delete) — Instagram does the same in dark mode. */
  destructive: "#ED4956",
} as const;

/** e.g. alpha(squad.accent, 0.14) -> "rgba(255, 255, 255, 0.14)" */
export function alpha(hex: string, opacity: number): string {
  const value = parseInt(hex.slice(1), 16);
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

/** Shared elevation recipe — a tight contact shadow plus a soft ambient one. */
export const cardShadow = "0 1px 2px rgba(0,0,0,0.5), 0 16px 32px -16px rgba(0,0,0,0.6)";
export const raisedShadow = "0 2px 4px rgba(0,0,0,0.55), 0 24px 48px -20px rgba(0,0,0,0.65)";
