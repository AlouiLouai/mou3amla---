import { NEARBY_GEO_ROUND_DECIMALS } from "@/features/payments/constants";

export interface CoarseLocation {
  lat: number;
  lng: number;
}

export function roundCoord(value: number): number {
  const factor = 10 ** NEARBY_GEO_ROUND_DECIMALS;
  return Math.round(value * factor) / factor;
}

// Best-effort, coarse-only location for nearby-proximity filtering. Never
// resolves with more precision than NEARBY_GEO_ROUND_DECIMALS, and resolves to
// null (never rejects) on denial/timeout/unsupported browser so callers can
// fall back to the unfiltered nearby pool instead of breaking the flow.
export function getCoarseLocation(): Promise<CoarseLocation | null> {
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    return Promise.resolve(null);
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: roundCoord(position.coords.latitude),
          lng: roundCoord(position.coords.longitude),
        });
      },
      () => resolve(null),
      { enableHighAccuracy: false, timeout: 5000, maximumAge: 60_000 },
    );
  });
}
