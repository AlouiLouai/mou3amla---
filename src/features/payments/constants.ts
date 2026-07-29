/** BCT Regulatory Sandbox exposure cap for a single volunteer-tester transaction (TND) - enforced here (display) and server-side in `server/actions.ts`. See docs/09-bct-sandbox-readiness.md; update if the submitted test plan changes. */
export const BCT_SANDBOX_TEST_LIMIT_TND = 500;

export const QR_TOKEN_TTL_MS = 60_000;

/** How long a published (unclaimed) nearby code stays live before rotating - the primary anti-brute-force control alongside nearby-claim rate limiting (see NEARBY_CODE_DIGITS in lib/nearby-code.ts). */
export const NEARBY_CODE_TTL_MS = 15_000;

/** How often the payer's "choose a code" screen re-fetches its options while idle. Kept well under NEARBY_CODE_TTL_MS (not 1:1) so a poll landing right before the owner's rotation still leaves enough runway to read and tap a code before it expires. */
export const NEARBY_OPTIONS_REFRESH_MS = 3_000;

/** Bounded window a matched nearby handoff gets to be mutually accepted, set fresh at claim time so it can't be extended indefinitely by the owner's background publish rotation. */
export const NEARBY_HANDSHAKE_TTL_MS = 45_000;

/** Coordinates are rounded to this many decimal places (~111m at the equator) before ever being stored - coarse enough for proximity bucketing, never precise enough to pinpoint an address. */
export const NEARBY_GEO_ROUND_DECIMALS = 3;

/** Bounding-box tolerance (degrees) for "nearby" coordinates (~1.1km) - kept loose because indoor GPS error routinely exceeds a tighter cutoff; nearby-claim's rate limit is the actual anti-brute-force control, not this radius. */
export const NEARBY_GEO_MATCH_RADIUS_DEG = 0.01;

/** Foreign-currency quick-entry for tourist accounts on the send screen. `rateToTnd` is an illustrative demo rate, never presented as authoritative (see guardrail #12) - only the keypad's input unit changes, `state.amount` and every downstream check still use TND. */
export const TOURIST_CURRENCIES = {
  EUR: { code: "EUR", symbol: "€", label: "Euro", rateToTnd: 3.3 },
  USD: { code: "USD", symbol: "$", label: "US Dollar", rateToTnd: 3.1 },
  GBP: { code: "GBP", symbol: "£", label: "British Pound", rateToTnd: 3.9 },
  TND: { code: "TND", symbol: "DT", label: "Tunisian Dinar", rateToTnd: 1 },
} as const;

export type TouristCurrencyCode = keyof typeof TOURIST_CURRENCIES;
