export const squad = {
  bg: "#FFF7FB",
  surface: "#FFFFFF",
  card: "#FFFFFF",
  cardAlt: "#FFF1F7",
  border: "rgba(0,0,0,0.08)",
  borderStrong: "rgba(255,0,131,0.22)",
  text: "#050505",
  textMuted: "rgba(5,5,5,0.62)",
  textFaint: "rgba(5,5,5,0.36)",
  accent: "#FF0083",
  subtle: "#FF8D28",
  destructive: "#D93072",
  hero: "#050505",
} as const;

export function alpha(hex: string, opacity: number): string {
  const value = parseInt(hex.slice(1), 16);
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

export const cardShadow = "0 16px 40px rgba(255,0,131,0.10), 0 6px 18px rgba(0,0,0,0.07)";
export const raisedShadow = "0 26px 60px rgba(255,0,131,0.14), 0 10px 24px rgba(0,0,0,0.10)";
