// Server-rendered, no client JS involved: the CSS animation (see
// `mou3amla-splash-out` in globals.css) hides this after a fixed delay on its
// own. Doing it in pure CSS instead of a mounted-state effect means it paints
// on the very first frame of every fresh document load (App Router
// navigations inside the mou3amla shell don't reload the document, so this only
// ever appears once per real launch) with no hydration-timing dependency -
// the thing that makes a splash screen actually work on Android, where the
// Web App Manifest spec has no field for a custom launch image the way iOS's
// apple-touch-startup-image does.
export function SplashScreen() {
  return (
    <div aria-hidden className="mou3amla-splash">
      {/* eslint-disable-next-line @next/next/no-img-element -- full-bleed static launch asset, not an optimizable content image */}
      <img src="/splash_screen.jpg" alt="" className="mou3amla-splash-image" />
    </div>
  );
}
