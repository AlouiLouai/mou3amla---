"use client";

import { Suspense, useEffect, type ReactNode } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { PostHogProvider, usePostHog } from "posthog-js/react";
import { env } from "@/config/env";

// Manual pageview capture: App Router navigations aren't full page loads, so
// PostHog's own autocapture never fires again after the first one.
function PostHogPageview() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const posthog = usePostHog();

  useEffect(() => {
    if (!pathname) return;
    const query = searchParams?.toString();
    posthog.capture("$pageview", {
      $current_url: query ? `${window.location.origin}${pathname}?${query}` : `${window.location.origin}${pathname}`,
    });
  }, [pathname, searchParams, posthog]);

  return null;
}

/** Entirely opt-in: with no `NEXT_PUBLIC_POSTHOG_KEY` set, renders children directly - zero init, zero network calls. */
export function AnalyticsProvider({ children }: { children: ReactNode }) {
  if (!env.NEXT_PUBLIC_POSTHOG_KEY) {
    return <>{children}</>;
  }

  return (
    <PostHogProvider
      apiKey={env.NEXT_PUBLIC_POSTHOG_KEY}
      options={{
        api_host: env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com",
        person_profiles: "identified_only",
        capture_pageview: false,
        // Catches unhandled window errors/rejections; caught React render
        // errors are reported separately via posthog.captureException (error.tsx).
        capture_exceptions: true,
        session_recording: {
          // Routing values are pre-masked before reaching the DOM (maskRoutingValue
          // in wallets/lib/routing.ts) - this covers the raw <input> elements.
          maskAllInputs: true,
        },
      }}
    >
      <Suspense fallback={null}>
        <PostHogPageview />
      </Suspense>
      {children}
    </PostHogProvider>
  );
}
