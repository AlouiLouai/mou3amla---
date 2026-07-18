const DEFAULT_TIMEOUT_MS = 10_000;

/**
 * `fetch` with a default timeout, so a stalled request always eventually
 * rejects instead of hanging indefinitely - matters most for the polling
 * loops (QR rotation, nearby handoff) where a hung request
 * would otherwise sit silently rather than falling through to a retry.
 * Pass `init.signal` yourself to opt out (e.g. to compose with your own
 * AbortController).
 */
export function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit = {}, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<Response> {
  return fetch(input, { ...init, signal: init.signal ?? AbortSignal.timeout(timeoutMs) });
}
