const STORAGE_KEY = "mou3amla-last-scan-role";

export type ScanRole = "send" | "receive";

// Read/written only inside click handlers, never render/mount - no useSyncExternalStore needed (docs/06-conventions.md).
export function getLastScanRole(): ScanRole {
  if (typeof window === "undefined") return "send";
  return window.localStorage.getItem(STORAGE_KEY) === "receive" ? "receive" : "send";
}

export function setLastScanRole(role: ScanRole) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, role);
}
