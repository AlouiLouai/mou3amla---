import { NextResponse } from "next/server";
import { withRouteErrorHandling } from "@/lib/api-handler";
import { resolveRefIdFromProviderCallback, verifyAndFinalizeProviderReturn } from "@/features/payments/server/provider-returns";
import { checkRateLimit } from "@/lib/rate-limit";

async function handleWebhook(request: Request) {
  const url = new URL(request.url);

  // We put `?ref=` on the webhook URL we hand Flouci, but fall back to the
  // Flouci `payment_id` (documented to be appended on the browser redirect,
  // and echoed on the webhook) so a callback that arrives without our own
  // param still resolves to the right transaction.
  const paymentIdFromBody = await readPaymentIdFromBody(request);
  const refId = await resolveRefIdFromProviderCallback({
    refId: url.searchParams.get("ref"),
    providerPaymentRef: url.searchParams.get("payment_id") ?? paymentIdFromBody,
  });

  if (!refId) {
    return NextResponse.json({ message: "Missing payment reference." }, { status: 400 });
  }

  // Unauthenticated (the provider's webhook and the browser's return-URL
  // redirect both hit this with no session) - keyed by refId rather than a
  // user id, since that's what a naive hammer/enumeration attempt would
  // actually vary, and it's what bounds the real cost here: repeated
  // outbound status calls to Flouci/Konnect's own API for one transaction.
  const withinLimit = await checkRateLimit(`payment-webhook:flouci:${refId}`, { max: 20, windowSeconds: 60 });
  if (!withinLimit) {
    return NextResponse.json({ message: "Too many attempts. Please wait a moment and try again." }, { status: 429 });
  }

  const result = await verifyAndFinalizeProviderReturn("flouci", refId);
  return NextResponse.json({ ok: result.ok, redirectTo: result.redirectTo });
}

async function readPaymentIdFromBody(request: Request): Promise<string | null> {
  if (request.method !== "POST") {
    return null;
  }

  try {
    const clone = request.clone();
    const contentType = clone.headers.get("content-type") ?? "";

    if (contentType.includes("application/json")) {
      const body = (await clone.json()) as Record<string, unknown> | null;
      const value = body?.payment_id ?? (body as { result?: { payment_id?: unknown } } | null)?.result?.payment_id;
      return typeof value === "string" ? value : null;
    }

    if (contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data")) {
      const form = await clone.formData();
      const value = form.get("payment_id");
      return typeof value === "string" ? value : null;
    }
  } catch {
    // Body isn't parseable as we expected - fall back to the query param path.
  }

  return null;
}

export const GET = withRouteErrorHandling(handleWebhook);
export const POST = withRouteErrorHandling(handleWebhook);
