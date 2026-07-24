// Instagram-derived palette, now theme-reactive: bg/surface/card/border/text
// tokens resolve through CSS custom properties (see :root/.dark in
// globals.css) so the app-wide light/dark toggle repaints every screen that
// uses this object without per-component changes. accent/subtle/destructive
// stay fixed hex in both themes - brand/semantic colors, not surfaces - and
// are literally igGradient's own stops, so the palette and igGradient can
// never visually drift apart. `hero` also stays fixed dark: it's the
// deliberately-always-dark surface used by hero banner cards
// (passkey-screen, verification-flow-screen) and paired with hardcoded white
// text there - see docs/05-styling-ui.md.
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

// The shared "story ring" / highlight gradient - avatar rings, the auth logo
// badge, and gradient-bordered pitch/invite cards all reuse this exact
// string rather than each hand-rolling their own stops.
export const igGradient = "linear-gradient(135deg, #0095F6, #7A3EF0, #ED4956)";

// Accepts either a literal hex color (accent/subtle/destructive/hero) or one
// of the var(--mou3amla-*) references above - hex takes the fast manual-math
// path unchanged from before; a CSS var goes through color-mix() so the
// resulting translucent color still tracks whichever theme is active instead
// of being computed once against a color that may no longer apply.
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

// Plain dark elevation instead of a colored glow - a pink-tinted shadow made
// sense on a white surface; on black it would just look like a color cast,
// so this now leans on real shadow depth the way the mockup's mostly-flat,
// border-driven cards do.
export const cardShadow = "0 8px 20px rgba(0,0,0,0.4), 0 2px 8px rgba(0,0,0,0.3)";
export const raisedShadow = "0 16px 36px rgba(0,0,0,0.5), 0 6px 16px rgba(0,0,0,0.35)";
