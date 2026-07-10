"use client";

import { useSyncExternalStore } from "react";

function subscribe() {
  return () => {};
}

/**
 * Idiomatic replacement for the classic `useEffect(() => setMounted(true), [])`
 * gate: `useSyncExternalStore` lets React swap the server placeholder (`false`)
 * for the real client value right after hydration, with no manual setState in
 * an effect body (which eslint-plugin-react-hooks now flags).
 */
export function useHasMounted(): boolean {
  return useSyncExternalStore(subscribe, () => true, () => false);
}
