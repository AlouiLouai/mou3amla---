"use client";

import { useEffect } from "react";

// Catches errors thrown by the root layout itself, where the nearest regular
// error.tsx boundary can't help because the layout it would render inside is
// what broke. Must render its own <html>/<body> since it replaces the root
// layout entirely while active. This Next.js build exposes `unstable_retry`,
// not the `reset` prop from stock Next.js docs - see
// node_modules/next/dist/docs/01-app/01-getting-started/10-error-handling.md.
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
        <div style={{ fontSize: "1.125rem", fontWeight: 900 }}>SQUAD couldn&apos;t load.</div>
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
