import { LogoLockup } from "@/features/mou3amla/components/logo-lockup";

// Server-rendered, no client JS involved beyond the inline cookie-setting
// script: the CSS animation (see `mou3amla-splash-out` in globals.css) hides
// this after a fixed delay on its own. Doing it in pure CSS instead of a
// mounted-state effect means it paints on the very first frame of every
// fresh document load (App Router navigations inside the mou3amla shell
// don't reload the document, so this only ever appears once per real
// launch) with no hydration-timing dependency - the thing that makes a
// splash screen actually work on Android, where the Web App Manifest spec
// has no field for a custom launch image the way iOS's
// apple-touch-startup-image does.
//
// Reuses the exact same logo lockup as the auth screen (LogoLockup) instead
// of the static /splash_screen.jpg asset, so the very first thing a user
// sees is pixel-consistent with the sign-in screen right after it, rather
// than a separately-authored image that can drift out of sync with the
// theme.
//
// The auth handoff (`/` -> `/verify` -> `/home`) uses server-side redirects,
// each of which is a brand-new document load - so RootLayout, and this
// component with it, remounts on every one of those steps too. Gating on a
// session cookie (set the instant this mounts, read by RootLayout on the
// next request) keeps it to one real flash per launch instead of once per
// redirect. It's deliberately a session cookie (no Max-Age) rather than
// localStorage: closing/reopening the installed PWA ends that browser
// session, which is exactly when the launch splash should be allowed to
// reappear.
export function SplashScreen() {
  return (
    <div aria-hidden className="mou3amla-splash">
      <LogoLockup />
      <script
        dangerouslySetInnerHTML={{
          __html: `document.cookie="mou3amla-splash-seen=1;path=/;SameSite=Lax";`,
        }}
      />
    </div>
  );
}
