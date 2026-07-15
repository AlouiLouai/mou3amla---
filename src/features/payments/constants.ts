export const QR_TOKEN_TTL_MS = 60_000;

/** Bounded window a matched nearby handoff gets to be mutually accepted, set fresh at claim time so it can't be extended indefinitely by the owner's background publish rotation. */
export const NEARBY_HANDSHAKE_TTL_MS = 45_000;

/** Coordinates are rounded to this many decimal places (~111m at the equator) before ever being stored - coarse enough for proximity bucketing, never precise enough to pinpoint an address. */
export const NEARBY_GEO_ROUND_DECIMALS = 3;

/** Bounding-box tolerance (degrees) used to decide two rounded coordinates count as "nearby" - roughly ~1.1km. */
export const NEARBY_GEO_MATCH_RADIUS_DEG = 0.01;
