"use client";

import { useEffect, useRef, useState } from "react";
import type { RecipientPreview } from "@/features/payments/types";
import { fetchWithTimeout } from "@/lib/fetch-with-timeout";

const SEARCH_DEBOUNCE_MS = 250;

export function useRecipientSearch(query: string, enabled: boolean) {
  const [results, setResults] = useState<RecipientPreview[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  // The exact query string the most recently *completed* search ran
  // against - lets the caller tell "a search finished with zero results"
  // apart from "no search has run for this query yet" (both otherwise look
  // like `!isSearching && results.length === 0`) via a plain derived
  // comparison below, with no extra setState call (and so no synchronous
  // setState-in-effect) needed to "reset" it when `query` changes.
  const [searchedQuery, setSearchedQuery] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    if (!enabled || query.trim().length < 2) {
      // Nothing to search; the caller only renders results while `enabled` is
      // true, so leaving stale state here is harmless and avoids a
      // synchronous setState-in-effect on every keystroke.
      return;
    }

    const requestId = ++requestIdRef.current;

    const timer = setTimeout(() => {
      setIsSearching(true);
      void (async () => {
        try {
          const response = await fetchWithTimeout(`/api/users/search?q=${encodeURIComponent(query.trim())}`, { cache: "no-store" });
          const payload = (await response.json()) as { users?: RecipientPreview[] };
          if (requestIdRef.current !== requestId) return;
          setResults(response.ok ? (payload.users ?? []) : []);
        } catch {
          if (requestIdRef.current === requestId) setResults([]);
        } finally {
          if (requestIdRef.current === requestId) {
            setIsSearching(false);
            setSearchedQuery(query);
          }
        }
      })();
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [query, enabled]);

  return { results, isSearching, hasSearched: searchedQuery === query };
}
