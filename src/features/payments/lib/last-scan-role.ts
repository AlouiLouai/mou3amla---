const STORAGE_KEY = "mou3amla-last-scan-role";

export type ScanRole = "send" | "receive";

// Read/written imperatively inside click handlers (goScanQr/goReceiveQr,
// ScanRoleSwitch), never during render or a mount effect - so this doesn't
// need useSyncExternalStore's hydration-safety dance (see
// docs/06-conventions.md), it's a plain browser API call after the user has
// already interacted with a hydrated page.
export function getLastScanRole(): ScanRole {
  if (typeof window === "undefined") return "send";
  return window.localStorage.getItem(STORAGE_KEY) === "receive" ? "receive" : "send";
}

export function setLastScanRole(role: ScanRole) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, role);
}
