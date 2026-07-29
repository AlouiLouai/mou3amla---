"use client";

import { useEffect } from "react";
import posthog from "posthog-js";

// Catches errors from the root layout itself, where the nearest error.tsx
// can't help - must render its own <html>/<body>. This build exposes
// `unstable_retry`, not stock Next.js's `reset` prop (see
// node_modules/next/dist/docs/01-app/01-getting-started/10-error-handling.md).
// Imports the raw posthog-js singleton, not usePostHog(), since this renders
// outside AnalyticsProvider (the very layout that just broke).
export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(
      JSON.stringify({
        level: "error",
        message: "Root layout render error",
        time: new Date().toISOString(),
        name: error.name,
        errorMessage: error.message,
        digest: error.digest,
      }),
    );
    posthog.captureException(error, { digest: error.digest, boundary: "global" });
  }, [error]);

  return (
    <html>
      <body
        style={{
          display: "flex",
          minHeight: "100dvh",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "1rem",
          padding: "1.5rem",
          textAlign: "center",
          fontFamily: "system-ui, sans-serif",
          background: "#FFF7FB",
          color: "#050505",
        }}
      >
        <div style={{ fontSize: "1.125rem", fontWeight: 900 }}>Mou3amla couldn&apos;t load.</div>
        <p style={{ maxWidth: 280, fontSize: "0.875rem", color: "rgba(5,5,5,0.62)" }}>
          Something broke while loading the app shell. Nothing was lost - try again.
        </p>
        <button
          type="button"
          onClick={() => unstable_retry()}
          style={{
            borderRadius: 9999,
            padding: "0.5rem 1rem",
            fontSize: "0.875rem",
            fontWeight: 700,
            color: "#FFFFFF",
            background: "#FF0083",
            border: "none",
          }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
