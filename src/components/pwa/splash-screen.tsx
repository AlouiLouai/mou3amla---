import { LogoLockup } from "@/features/mou3amla/components/logo-lockup";

/**
 * Server-rendered Android launch splash (no Web App Manifest field for this
 * the way iOS has apple-touch-startup-image) - pure CSS animation
 * (`mou3amla-splash-out` in globals.css) hides it, so it paints on the first
 * frame with no hydration-timing dependency. Reuses `LogoLockup` so it's
 * pixel-consistent with the sign-in screen right after it. Gated on a
 * session cookie (not localStorage, so it reappears each new PWA session) to
 * survive the `/` -> `/verify` -> `/home` server-redirect handoff without
 * re-flashing on every hop.
 */
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
