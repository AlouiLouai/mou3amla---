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
 * should stay guessable. Was 5s (2026-07-25), bumped to 10s the same day
 * after real use showed a 5-digit code rotating that fast is hard to read
 * and tap in time, not just hard to guess - still far tighter than the
 * original 15s. */
export const NEARBY_CODE_TTL_MS = 10_000;

/** How often the payer's nearby "choose a code" screen re-fetches its 4
 * options while idle (no match yet). Deliberately well under
 * NEARBY_CODE_TTL_MS, not 1:1 with it (was 1:1 at 10s for a while - a real
 * production session showed why that's broken): the owner's rotation and
 * this poll are two independent, unsynchronized `setInterval`s, each
 * anchored to whenever its own screen happened to mount. At a 1:1 period
 * neither timer ever resyncs to the other, so whatever phase offset exists
 * between them at mount time is fixed for the rest of the session - if
 * that offset happens to land the payer's poll just before the owner's
 * next rotation, the human read-4-digits-and-tap time reliably exceeds the
 * sliver of validity left, and *every* tap for that entire session 404s as
 * "unavailable", not just an occasional unlucky one. Polling at roughly a
 * third of the TTL guarantees multiple fresh snapshots inside every
 * rotation window regardless of phase, so there's always one with enough
 * runway left to actually read and tap. A stale option can still rarely
 * lose the race right at the boundary - that failure path is handled
 * gracefully (`submitNearbyOption`'s error toast in use-qr-nearby-actions.ts
 * immediately re-triggers loadNearbyOptions() on a stale/expired code, or
 * waits for the next scheduled poll on a "busy" one - see the `reason` field
 * on /api/nearby/claim's error response) - but it's the rare case now, not
 * the guaranteed one. */
export const NEARBY_OPTIONS_REFRESH_MS = 3_000;

/** Bounded window a matched nearby handoff gets to be mutually accepted, set fresh at claim time so it can't be extended indefinitely by the owner's background publish rotation. */
export const NEARBY_HANDSHAKE_TTL_MS = 45_000;

/** Coordinates are rounded to this many decimal places (~111m at the equator) before ever being stored - coarse enough for proximity bucketing, never precise enough to pinpoint an address. */
export const NEARBY_GEO_ROUND_DECIMALS = 3;

/** Bounding-box tolerance (degrees) used to decide two rounded coordinates
 * count as "nearby" - roughly ~1.1km. A tighter, exact-distance gate (e.g.
 * "within 30m" via `enableHighAccuracy: true`) was considered and rejected:
 * indoor GPS error routinely exceeds 30m on its own (no sky view - exactly
 * the case for a café), so a hard 30m cutoff would false-reject two phones
 * sitting at the same table more often than it would ever catch a real
 * abuse case - `nearby-claim`'s rate limit (8/30s against a 100k-code
 * keyspace) is what actually bounds brute-forcing, not this radius. Don't
 * tighten this back toward a literal small-meter cutoff without re-testing
 * indoor GPS accuracy first. */
export const NEARBY_GEO_MATCH_RADIUS_DEG = 0.01;

/** Foreign-currency input on the send screen, tourist accounts only (see
 * AccountType in auth/types.ts) - a visitor thinks in their own currency,
 * not TND, and shouldn't have to mentally convert before typing an amount.
 * `rateToTnd` is an illustrative demo rate, not a live feed - never present
 * it as authoritative (see the "Demo rate" label wherever it's shown, and
 * guardrail #12 in docs/07-agent-guardrails.md on not inventing real
 * regulated financial figures). The actual payment_transactions row, the
 * BCT sandbox cap, and every other downstream check still operate in TND
 * exactly as before - this only changes what the *keypad* means for a
 * tourist, converted client-side before it ever reaches state.amount. */
export const TOURIST_CURRENCIES = {
  EUR: { code: "EUR", symbol: "€", label: "Euro", rateToTnd: 3.3 },
  USD: { code: "USD", symbol: "$", label: "US Dollar", rateToTnd: 3.1 },
  GBP: { code: "GBP", symbol: "£", label: "British Pound", rateToTnd: 3.9 },
  TND: { code: "TND", symbol: "DT", label: "Tunisian Dinar", rateToTnd: 1 },
} as const;

export type TouristCurrencyCode = keyof typeof TOURIST_CURRENCIES;
