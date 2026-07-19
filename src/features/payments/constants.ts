export const QR_TOKEN_TTL_MS = 60_000;

/** How long a published (unclaimed) nearby code stays live before rotating -
 * short on purpose: this is the window an attacker would have to brute-force
 * a code (see NEARBY_CODE_DIGITS in lib/nearby-code.ts) or a payer would have
 * to browse/pick one, so it trades off against nearby-claim rate limiting as
 * the primary anti-brute-force control. Independent of QR_TOKEN_TTL_MS - the
 * QR image can stay legible on screen longer than a rapid-fire numeric code
 * should stay guessable. */
export const NEARBY_CODE_TTL_MS = 15_000;

/** How often the payer's nearby "choose a code" screen re-fetches its 4
 * options while idle (no match yet). Deliberately a fraction of
 * NEARBY_CODE_TTL_MS, not equal to it: the owner's rotation and this poll are
 * two independent, unsynchronized clocks, so if they ran on the same period
 * the payer's snapshot could lag the owner's actual current code by up to
 * nearly a full cycle - barely noticeable at the old 60s TTL against normal
 * human reaction time, but large enough at 15s to show up on almost every
 * attempt. Polling at ~4x the rotation frequency bounds that staleness to a
 * few seconds instead. */
export const NEARBY_OPTIONS_REFRESH_MS = 4_000;

/** Bounded window a matched nearby handoff gets to be mutually accepted, set fresh at claim time so it can't be extended indefinitely by the owner's background publish rotation. */
export const NEARBY_HANDSHAKE_TTL_MS = 45_000;

/** Coordinates are rounded to this many decimal places (~111m at the equator) before ever being stored - coarse enough for proximity bucketing, never precise enough to pinpoint an address. */
export const NEARBY_GEO_ROUND_DECIMALS = 3;

/** Bounding-box tolerance (degrees) used to decide two rounded coordinates count as "nearby" - roughly ~1.1km. */
export const NEARBY_GEO_MATCH_RADIUS_DEG = 0.01;
