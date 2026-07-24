/** BCT Regulatory Sandbox exposure cap for a single volunteer-tester
 * transaction (TND) - keeps financial exposure quantifiable and bounded for
 * the regulatory test plan. Enforced both here (display, see
 * `generate-intent-screen.tsx`) and server-side in `server/actions.ts`, so
 * the on-screen badge is never just decorative. See
 * docs/09-bct-sandbox-readiness.md. This is a proposed test-plan figure, not
 * a value BCT itself has mandated - update it if the actual submitted test
 * plan uses a different number. */
export const BCT_SANDBOX_TEST_LIMIT_TND = 500;

export const QR_TOKEN_TTL_MS = 60_000;

/** How long a published (unclaimed) nearby code stays live before rotating -
 * short on purpose: this is the window an attacker would have to brute-force
 * a code (see NEARBY_CODE_DIGITS in lib/nearby-code.ts) or a payer would have
 * to browse/pick one, so it trades off against nearby-claim rate limiting as
 * the primary anti-brute-force control. Independent of QR_TOKEN_TTL_MS - the
 * QR image can stay legible on screen longer than a rapid-fire numeric code
 * should stay guessable. Tightened from 15s to 5s (2026-07-25) for a more
 * responsive coffee-shop-density feel - shorter is strictly *more* secure
 * here (a tighter brute-force window), not less, so this isn't a tradeoff. */
export const NEARBY_CODE_TTL_MS = 5_000;

/** How often the payer's nearby "choose a code" screen re-fetches its 4
 * options while idle (no match yet). Matches NEARBY_CODE_TTL_MS 1:1
 * (2026-07-25) rather than polling faster than it - the owner's rotation and
 * this poll are two independent, unsynchronized clocks, so a stale option
 * the payer taps can still occasionally lose the race and come back
 * "unavailable" from the server. That failure path already exists and is
 * handled gracefully (`submitNearbyOption`'s error toast in
 * use-qr-nearby-actions.ts) - and now also immediately re-triggers
 * loadNearbyOptions() on that specific failure, instead of leaving the
 * stale grid on screen until the next tick, which is what actually keeps
 * this robust at a 1:1 ratio rather than needing a faster fractional poll. */
export const NEARBY_OPTIONS_REFRESH_MS = 5_000;

/** Bounded window a matched nearby handoff gets to be mutually accepted, set fresh at claim time so it can't be extended indefinitely by the owner's background publish rotation. */
export const NEARBY_HANDSHAKE_TTL_MS = 45_000;

/** Coordinates are rounded to this many decimal places (~111m at the equator) before ever being stored - coarse enough for proximity bucketing, never precise enough to pinpoint an address. */
export const NEARBY_GEO_ROUND_DECIMALS = 3;

/** Bounding-box tolerance (degrees) used to decide two rounded coordinates count as "nearby" - roughly ~1.1km. */
export const NEARBY_GEO_MATCH_RADIUS_DEG = 0.01;
