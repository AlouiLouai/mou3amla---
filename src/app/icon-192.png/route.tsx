import { ImageResponse } from "next/og";
import { Mou3amlaMark } from "@/features/mou3amla/mark";

export const size = { width: 192, height: 192 };
export const contentType = "image/png";

export function GET() {
  return new ImageResponse(<Mou3amlaMark size={size.width} />, { ...size });
}
