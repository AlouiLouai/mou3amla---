import { ImageResponse } from "next/og";
import { SquadMark } from "@/features/squad/mark";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

// SquadMark already keeps its content within a ~74% centered safe zone over
// a full-bleed background, which is what maskable icons need — OS launchers
// crop/mask the outer edges, so nothing important can live out there.
export function GET() {
  return new ImageResponse(<SquadMark size={size.width} />, { ...size });
}
