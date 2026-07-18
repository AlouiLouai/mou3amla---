import "server-only";

import { headers } from "next/headers";

/** Best-effort client IP for Server Actions, which don't receive a `Request` directly. */
export async function getClientIp(): Promise<string> {
  const headerList = await headers();
  const forwardedFor = headerList.get("x-forwarded-for");

  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }

  return headerList.get("x-real-ip") ?? "unknown";
}
