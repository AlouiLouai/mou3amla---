// Toned-down fintech palette: pink/orange stay the brand accent hues, but
// reserved for CTAs, highlights, and active states - surfaces are neutral
// (white/soft grey/dark grey) instead of pink-tinted or pure black.
export const squad = {
  bg: "#FAFAFA",
  surface: "#FFFFFF",
  card: "#FFFFFF",
  cardAlt: "#F4F4F5",
  border: "rgba(0,0,0,0.08)",
  borderStrong: "rgba(0,0,0,0.14)",
  text: "#050505",
  textMuted: "rgba(5,5,5,0.62)",
  textFaint: "rgba(5,5,5,0.36)",
  accent: "#FF0083",
  subtle: "#FF8D28",
  destructive: "#D93072",
  hero: "#1C1C1E",
} as const;

export function alpha(hex: string, opacity: number): string {
  const value = parseInt(hex.slice(1), 16);
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

export const cardShadow = "0 10px 24px rgba(255,0,131,0.08), 0 4px 12px rgba(0,0,0,0.05)";
export const raisedShadow = "0 18px 36px rgba(255,0,131,0.10), 0 8px 18px rgba(0,0,0,0.08)";
