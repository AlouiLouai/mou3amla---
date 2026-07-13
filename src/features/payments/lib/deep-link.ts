"use client";

/**
 * Best-effort attempt to hand off to a native app via a custom URI scheme.
 *
 * On a real phone, a registered custom scheme is intercepted by the OS
 * before the browser navigates anywhere. When nothing claims the scheme
 * (no app installed, desktop browser), setting `window.location.href`
 * directly to an unrecognized scheme can navigate the top-level document to
 * a browser error page and kill the SPA — confirmed while testing this
 * (the whole installed PWA tab went blank). The attempt is contained to a
 * hidden iframe instead, so a failed attempt never affects the page hosting
 * this app.
 *
 * There is deliberately no automatic fallback redirect here: forcing the
 * user's tab away from an installed PWA after a timeout is jarring, and the
 * web gateway isn't a real deployed service yet in this prototype anyway.
 * Instead, the UI (see `intent-result-screen.tsx`) shows a visible "continue
 * via gateway" link the user can tap, which opens in a new tab.
 */
export function attemptNativeHandoff(url: string): void {
  const iframe = document.createElement("iframe");
  iframe.style.display = "none";
  document.body.appendChild(iframe);
  try {
    iframe.contentWindow?.location.replace(url);
  } catch {
    // Some browsers throw synchronously for unrecognized schemes — that's
    // fine, it's contained to the iframe either way.
  }
  window.setTimeout(() => iframe.remove(), 1500);
}
