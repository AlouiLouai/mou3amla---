"use client";

import { useEffect } from "react";

// Error boundaries must be Client Components. This Next.js build's error
// file convention exposes `unstable_retry`, not the `reset` prop from
// stock Next.js docs - see node_modules/next/dist/docs/01-app/01-getting-started/10-error-handling.md.
export default function ErrorPage({
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
        message: "Route render error",
        time: new Date().toISOString(),
        name: error.name,
        errorMessage: error.message,
        digest: error.digest,
      }),
    );
  }, [error]);

  return (
    <div className="bg-background text-foreground flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="text-lg font-black">Something went wrong.</div>
      <p className="text-muted-foreground max-w-xs text-sm">
        SQUAD hit an unexpected error. Nothing was lost - try again, or head back home.
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => unstable_retry()}
          className="bg-primary text-primary-foreground rounded-full px-4 py-2 text-sm font-bold"
        >
          Try again
        </button>
        <a href="/home" className="border-border rounded-full border px-4 py-2 text-sm font-bold">
          Go home
        </a>
      </div>
    </div>
  );
}
