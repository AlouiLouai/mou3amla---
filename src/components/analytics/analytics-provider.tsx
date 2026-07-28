"use client";

import { Suspense, useEffect, type ReactNode } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { PostHogProvider, usePostHog } from "posthog-js/react";
import { env } from "@/config/env";

// App Router navigations aren't full page loads, so PostHog's own
// `capture_pageview` autocapture (page-load-based) never fires again after
// the first one - this is the client-side substitute, same pattern as
// PostHog's own Next.js App Router guide. `useSearchParams` requires a
// Suspense boundary in the App Router (it can otherwise force the whole
// page into client-only rendering) - see the wrapping <Suspense> below.
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

/** Entirely opt-in: with no `NEXT_PUBLIC_POSTHOG_KEY` set (the default for
 * local dev and anyone without a PostHog project), this renders children
 * directly - zero init, zero network calls, never a hard requirement to run
 * the app. */
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
        // Catches truly unhandled window errors/promise rejections. React
        // render errors caught by error.tsx/global-error.tsx are reported
        // separately via posthog.captureException there - a caught error
        // never reaches window.onerror, so this alone wouldn't see them.
        capture_exceptions: true,
        session_recording: {
          // Routing values (RIB/wallet tag/merchant id) are already
          // pre-masked before they ever reach the DOM (see maskRoutingValue
          // in wallets/lib/routing.ts) - this covers the real <input>
          // elements instead (phone number, amounts, usernames).
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
