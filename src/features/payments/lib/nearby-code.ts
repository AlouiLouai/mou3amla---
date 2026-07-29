/** Single source of truth for the nearby code's shape, shared by server and client validation so the digit count never drifts. 5 digits (100,000 possibilities) balances brute-force resistance against being readable/tappable. */
export const NEARBY_CODE_DIGITS = 5;

export const NEARBY_CODE_REGEX = new RegExp(`^\\d{${NEARBY_CODE_DIGITS}}$`);

const NEARBY_CODE_MAX = 10 ** NEARBY_CODE_DIGITS;

export function generateNearbyCode(): string {
  return Math.floor(Math.random() * NEARBY_CODE_MAX)
    .toString()
    .padStart(NEARBY_CODE_DIGITS, "0");
}
