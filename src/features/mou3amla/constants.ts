/** Instagram-derived, theme-reactive palette - surface/text tokens resolve through CSS custom properties (see :root/.dark in globals.css); accent/subtle/destructive/hero stay fixed hex in both themes. See docs/05-styling-ui.md. */
export const mou3amla = {
  bg: "var(--mou3amla-bg)",
  surface: "var(--mou3amla-surface)",
  card: "var(--mou3amla-card)",
  cardAlt: "var(--mou3amla-card-alt)",
  border: "var(--mou3amla-border)",
  borderStrong: "var(--mou3amla-border-strong)",
  text: "var(--mou3amla-text)",
  textMuted: "var(--mou3amla-text-muted)",
  textFaint: "var(--mou3amla-text-faint)",
  accent: "#0095F6",
  subtle: "#7A3EF0",
  destructive: "#ED4956",
  hero: "#0A0A0A",
} as const;

/** Shared "story ring" / highlight gradient reused by avatar rings, the auth logo badge, and gradient-bordered pitch/invite cards. */
export const igGradient = "linear-gradient(135deg, #0095F6, #7A3EF0, #ED4956)";

/** Applies opacity to a hex color or a `var(--mou3amla-*)` reference - the latter goes through `color-mix()` so it keeps tracking whichever theme is active. */
export function alpha(color: string, opacity: number): string {
  if (color.startsWith("var(")) {
    return `color-mix(in srgb, ${color} ${Math.round(opacity * 100)}%, transparent)`;
  }

  const value = parseInt(color.slice(1), 16);
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

/** Plain dark elevation instead of a colored glow - a tinted shadow reads as a color cast on a black surface. */
export const cardShadow = "0 8px 20px rgba(0,0,0,0.4), 0 2px 8px rgba(0,0,0,0.3)";
export const raisedShadow = "0 16px 36px rgba(0,0,0,0.5), 0 6px 16px rgba(0,0,0,0.35)";

/** The only non-Instagram colors in the app - personal card-style choices in onboarding's profile builder only, never buttons/status/surfaces (see docs/05-styling-ui.md). */
export const identityGradients = {
  cyan: {
    id: "cyan",
    label: "Cyan",
    gradient: "linear-gradient(135deg, #22D3EE, #0891B2)",
    solid: "#22D3EE",
  },
  magenta: {
    id: "magenta",
    label: "Magenta",
    gradient: "linear-gradient(135deg, #F472B6, #C026D3)",
    solid: "#F472B6",
  },
  amber: {
    id: "amber",
    label: "Amber",
    gradient: "linear-gradient(135deg, #FBBF24, #D97706)",
    solid: "#FBBF24",
  },
  emerald: {
    id: "emerald",
    label: "Emerald",
    gradient: "linear-gradient(135deg, #34D399, #059669)",
    solid: "#34D399",
  },
} as const;

export type IdentityGradientId = keyof typeof identityGradients;
