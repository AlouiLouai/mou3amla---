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
 * options while idle (no match yet). Matches NEARBY_CODE_TTL_MS 1:1 - the
 * owner's rotation and this poll are two independent, unsynchronized
 * clocks, so a stale option the payer taps can still occasionally lose the
 * race and come back "unavailable" from the server. That failure path
 * already exists and is handled gracefully (`submitNearbyOption`'s error
 * toast in use-qr-nearby-actions.ts) - and also immediately re-triggers
 * loadNearbyOptions() on that specific failure, instead of leaving the
 * stale grid on screen until the next tick, which is what actually keeps
 * this robust at a 1:1 ratio rather than needing a faster fractional poll. */
export const NEARBY_OPTIONS_REFRESH_MS = 10_000;

/** Bounded window a matched nearby handoff gets to be mutually accepted, set fresh at claim time so it can't be extended indefinitely by the owner's background publish rotation. */
export const NEARBY_HANDSHAKE_TTL_MS = 45_000;

/** Coordinates are rounded to this many decimal places (~111m at the equator) before ever being stored - coarse enough for proximity bucketing, never precise enough to pinpoint an address. */
export const NEARBY_GEO_ROUND_DECIMALS = 3;

/** Bounding-box tolerance (degrees) used to decide two rounded coordinates count as "nearby" - roughly ~1.1km. */
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
