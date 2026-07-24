import { NextResponse } from "next/server";
import { withRouteErrorHandling } from "@/lib/api-handler";
import { verifyAndFinalizeProviderReturn } from "@/features/payments/server/provider-returns";
import { checkRateLimit } from "@/lib/rate-limit";

function buildBrowserRedirectHtml(redirectTo: string) {
  const escapedUrl = redirectTo.replace(/&/g, "&amp;").replace(/"/g, "&quot;");

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta http-equiv="refresh" content="0;url=${escapedUrl}" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Redirecting...</title>
  </head>
  <body>
    <p>Redirecting to <a href="${escapedUrl}">${escapedUrl}</a>...</p>
  </body>
</html>`;
}

export const GET = withRouteErrorHandling(async (request: Request) => {
  const url = new URL(request.url);
  const refId = url.searchParams.get("ref") ?? "";

  if (!refId) {
    return NextResponse.json({ message: "Missing payment reference." }, { status: 400 });
  }

  // Unauthenticated (the provider's webhook and the browser's return-URL
  // redirect both hit this with no session) - keyed by refId rather than a
  // user id, since that's what a naive hammer/enumeration attempt would
  // actually vary, and it's what bounds the real cost here: repeated
  // outbound status calls to Flouci/Konnect's own API for one transaction.
  const withinLimit = await checkRateLimit(`payment-webhook:konnect:${refId}`, { max: 20, windowSeconds: 60 });
  if (!withinLimit) {
    return NextResponse.json({ message: "Too many attempts. Please wait a moment and try again." }, { status: 429 });
  }

  const result = await verifyAndFinalizeProviderReturn("konnect", refId);
  const acceptsHtml = (request.headers.get("accept") ?? "").includes("text/html");
  const isDocumentNavigation = request.headers.get("sec-fetch-dest") === "document";

  if (acceptsHtml || isDocumentNavigation) {
    return new Response(buildBrowserRedirectHtml(result.redirectTo), {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  }

  return NextResponse.json({ ok: result.ok, redirectTo: result.redirectTo });
});
