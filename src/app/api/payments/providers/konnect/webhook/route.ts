import { NextResponse } from "next/server";
import { withRouteErrorHandling } from "@/lib/api-handler";
import { verifyAndFinalizeProviderReturn } from "@/features/payments/server/provider-returns";

export const GET = withRouteErrorHandling(async (request: Request) => {
  const url = new URL(request.url);
  const refId = url.searchParams.get("ref") ?? "";

  if (!refId) {
    return NextResponse.json({ message: "Missing payment reference." }, { status: 400 });
  }

  const result = await verifyAndFinalizeProviderReturn("konnect", refId);
  return NextResponse.json({ ok: result.ok, redirectTo: result.redirectTo });
});
