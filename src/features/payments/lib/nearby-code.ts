/** Single source of truth for the nearby handoff code's shape - shared
 * between server routes (generation, validation) and client code (input
 * validation, regex checks) so the digit count never drifts out of sync
 * between them. 5 digits (100,000 possibilities) trades a little typing
 * effort for a keyspace two orders of magnitude harder to brute-force than
 * the original 3 digits, while staying well within what a person can read
 * off one phone and tap on another. */
export const NEARBY_CODE_DIGITS = 5;

export const NEARBY_CODE_REGEX = new RegExp(`^\\d{${NEARBY_CODE_DIGITS}}$`);

const NEARBY_CODE_MAX = 10 ** NEARBY_CODE_DIGITS;

export function generateNearbyCode(): string {
  return Math.floor(Math.random() * NEARBY_CODE_MAX)
    .toString()
    .padStart(NEARBY_CODE_DIGITS, "0");
}
