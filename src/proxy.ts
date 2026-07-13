import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  const response = await updateSession(request);

  response.headers.set("x-request-id", crypto.randomUUID());
  response.headers.set("x-pathname", request.nextUrl.pathname);

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|sw\\.js|manifest\\.webmanifest|favicon\\.ico|.*\\.(?:png|jpg|jpeg|svg|webp|ico)$).*)",
  ],
};
