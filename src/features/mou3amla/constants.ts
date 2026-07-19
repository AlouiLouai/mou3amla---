// Dark, Instagram-derived palette: pure black surfaces throughout, with a
// single 3-stop gradient (blue -> purple -> red) supplying every semantic
// accent color used elsewhere in this object - accent/subtle/destructive are
// literally that gradient's own stops, so the palette and igGradient can
// never visually drift apart.
export const mou3amla = {
  bg: "#000000",
  surface: "#000000",
  card: "#121212",
  cardAlt: "#1c1c1e",
  border: "#262626",
  borderStrong: "#363636",
  text: "#FFFFFF",
  textMuted: "#A8A8A8",
  textFaint: "#555555",
  accent: "#0095F6",
  subtle: "#7A3EF0",
  destructive: "#ED4956",
  hero: "#0A0A0A",
} as const;

// The shared "story ring" / highlight gradient - avatar rings, the auth logo
// badge, and gradient-bordered pitch/invite cards all reuse this exact
// string rather than each hand-rolling their own stops.
export const igGradient = "linear-gradient(135deg, #0095F6, #7A3EF0, #ED4956)";

export function alpha(hex: string, opacity: number): string {
  const value = parseInt(hex.slice(1), 16);
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
