import { NextResponse } from "next/server";
import { withRouteErrorHandling } from "@/lib/api-handler";
import { verifyAndFinalizeProviderReturn } from "@/features/payments/server/provider-returns";

async function handleWebhook(request: Request) {
  const url = new URL(request.url);
  const refId = url.searchParams.get("ref") ?? "";

  if (!refId) {
    return NextResponse.json({ message: "Missing payment reference." }, { status: 400 });
  }

  const result = await verifyAndFinalizeProviderReturn("flouci", refId);
  return NextResponse.json({ ok: result.ok, redirectTo: result.redirectTo });
}

export const GET = withRouteErrorHandling(handleWebhook);
export const POST = withRouteErrorHandling(handleWebhook);
