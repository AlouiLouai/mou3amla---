import { ImageResponse } from "next/og";
import { SquadMark } from "@/features/squad/mark";

export const size = { width: 192, height: 192 };
export const contentType = "image/png";

export function GET() {
  return new ImageResponse(<SquadMark size={size.width} />, { ...size });
}
