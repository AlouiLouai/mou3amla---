import { ImageResponse } from "next/og";
import { Mou3amlaMark } from "@/features/mou3amla/mark";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(<Mou3amlaMark size={size.width} />, { ...size });
}
