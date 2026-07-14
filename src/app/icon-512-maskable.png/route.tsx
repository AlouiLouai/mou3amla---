import { ImageResponse } from "next/og";
import { SquadMark } from "@/features/squad/mark";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

// `maskable` shrinks the badge so its corners stay inside Android's ~40%
// safe-zone radius — OS launchers (including plain circular masks) crop
// anything outside it, so nothing important can live out there.
export function GET() {
  return new ImageResponse(<SquadMark size={size.width} maskable />, { ...size });
}
