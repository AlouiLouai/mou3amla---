import { useCallback, useRef, type RefObject } from "react";
import { toast } from "@/lib/toast";
import type { CoarseLocation } from "@/features/payments/lib/geolocation";
import { NEARBY_CODE_TTL_MS, QR_TOKEN_TTL_MS } from "@/features/payments/constants";
import type { NearbyHandoff, NearbyMatchStatus, QrToken } from "@/features/payments/types";
import { NEARBY_CODE_REGEX } from "@/features/payments/lib/nearby-code";
import type { Mou3amlaState } from "@/features/mou3amla/types";
import type { Patch } from "@/features/mou3amla/hooks/reducer";
import { vibrate } from "@/features/mou3amla/hooks/utils";
import { fetchWithTimeout } from "@/lib/fetch-with-timeout";
import { createClient } from "@/lib/supabase/client";

type NearbyHandoffRealtimeRow = {
  owner_user_id: string;
  payer_user_id: string | null;
  challenge_code: string;
  status: NearbyMatchStatus;
  owner_accepted_at: string | null;
  payer_accepted_at: string | null;
  expires_at: string;
  amount: number | null;
};

/**
 * QR-mint and nearby-handoff actions (rotation, publish, claim, accept,
 * realtime) shared by the send/receive/scan screens. Returned actions are
 * spread into `useMou3amlaApp`'s own `actions` object.
 */
export function useQrNearbyActions({
  dispatch,
  stateRef,
  timers,
  resolveNearbyGeo,
  goHome,
}: {
  dispatch: (patch: Patch) => void;
  stateRef: RefObject<Mou3amlaState>;
  timers: RefObject<Set<ReturnType<typeof setTimeout>>>;
  resolveNearbyGeo: () => Promise<CoarseLocation | null>;
  goHome: () => void;
}) {
  // Coalesces concurrent rotation calls (e.g. React Strict Mode's double-invoke)
  // into one shared in-flight request, so every caller awaits the same result.
  const qrRotationInFlightRef = useRef<Promise<QrToken | null> | null>(null);
  const nearbyRotationInFlightRef = useRef<Promise<NearbyHandoff | null> | null>(null);

  /** Re-mints the signed QR token on its own `QR_TOKEN_TTL_MS` cadence, independent of the (much shorter-lived) nearby code rotation below. */
  const startQrRotation = useCallback(() => {
    let cancelled = false;
    let didShowError = false;

    const performMint = async (): Promise<QrToken | null> => {
      const response = await fetchWithTimeout("/api/qr/mint", { method: "POST", cache: "no-store" });
      const payload = (await response.json()) as { message?: string; qrToken?: QrToken };
      return response.ok && payload.qrToken ? payload.qrToken : null;
    };

    const refresh = async () => {
      if (!qrRotationInFlightRef.current) {
        qrRotationInFlightRef.current = performMint().finally(() => {
          qrRotationInFlightRef.current = null;
        });
      }

      const qrToken = await qrRotationInFlightRef.current;

      if (!cancelled) {
        dispatch({ qrToken });
      }

      if (!qrToken && !didShowError) {
        toast.error("We couldn't mint a secure QR code right now.");
        didShowError = true;
      } else if (qrToken) {
        didShowError = false;
      }
    };

    void refresh();

    const interval = setInterval(() => void refresh(), QR_TOKEN_TTL_MS);
    timers.current.add(interval);

    return () => {
      cancelled = true;
      clearInterval(interval);
      timers.current.delete(interval);
    };
  }, [dispatch, timers]);

  /** Publishes/refreshes the host's nearby code, reading the current host amount fresh from `stateRef` each call. Shared by the automatic rotation below and `commitNearbyHostAmount`'s immediate push. */
  const publishNearby = useCallback(async (): Promise<NearbyHandoff | null> => {
    const geo = await resolveNearbyGeo();
    const rawAmount = stateRef.current.nearbyHostAmount.trim();
    const parsedAmount = rawAmount ? Number.parseFloat(rawAmount) : NaN;
    const amount = Number.isFinite(parsedAmount) && parsedAmount > 0 ? parsedAmount : undefined;

    if (!nearbyRotationInFlightRef.current) {
      nearbyRotationInFlightRef.current = (async () => {
        const response = await fetchWithTimeout("/api/nearby/publish", {
          method: "POST",
          cache: "no-store",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...(geo ?? {}), ...(amount !== undefined ? { amount } : {}) }),
        });
        const payload = (await response.json()) as { message?: string; handoff?: NearbyHandoff };
        return response.ok && payload.handoff ? payload.handoff : null;
      })().finally(() => {
        nearbyRotationInFlightRef.current = null;
      });
    }

    return nearbyRotationInFlightRef.current;
  }, [resolveNearbyGeo, stateRef]);

  /** Publishes a fresh nearby code every `NEARBY_CODE_TTL_MS` while the receive screen's host panel is mounted. `/api/nearby/publish` itself no-ops once a payer has claimed the code, so this is safe to keep running through a live handshake. */
  const startNearbyPublishRotation = useCallback(() => {
    let cancelled = false;
    let didShowError = false;

    const refresh = async () => {
      const nearbyHandoff = await publishNearby();

      if (!cancelled) {
        dispatch({ nearbyHandoff });
      }

      if (!nearbyHandoff && !didShowError) {
        toast.error("We couldn't publish the nearby code right now.");
        didShowError = true;
      } else if (nearbyHandoff) {
        didShowError = false;
      }
    };

    void refresh();

    const interval = setInterval(() => void refresh(), NEARBY_CODE_TTL_MS);
    timers.current.add(interval);

    return () => {
      cancelled = true;
      clearInterval(interval);
      timers.current.delete(interval);
    };
  }, [dispatch, publishNearby, timers]);

  const setNearbyHostAmount = useCallback(
    (value: string) => {
      dispatch({ nearbyHostAmount: value });
    },
    [dispatch],
  );

  /** Pushes the host's just-typed amount immediately instead of waiting for the next rotation tick. */
  const commitNearbyHostAmount = useCallback(async () => {
    const nearbyHandoff = await publishNearby();
    if (nearbyHandoff) {
      dispatch({ nearbyHandoff });
    } else {
      toast.error("We couldn't update the amount right now.");
    }
  }, [dispatch, publishNearby]);

  const optionsInFlightRef = useRef<Promise<{ options: string[]; hasLiveMatch: boolean } | null> | null>(null);

  /** Fetches the payer's "choose a code" grid. Coalesced the same way as the rotations above, since the auto-refresh interval, a manual retry, and Strict Mode's double-invoke can all fire at once. */
  const loadNearbyOptions = useCallback(() => {
    dispatch({ isLoadingNearbyOptions: true });

    const performLoad = async (): Promise<{ options: string[]; hasLiveMatch: boolean } | null> => {
      const geo = await resolveNearbyGeo();
      const query = geo ? `?lat=${geo.lat}&lng=${geo.lng}` : "";
      const response = await fetchWithTimeout(`/api/nearby/options${query}`, {
        method: "GET",
        cache: "no-store",
      });
      const payload = (await response.json()) as { message?: string; options?: string[]; hasLiveMatch?: boolean };
      return response.ok && payload.options ? { options: payload.options, hasLiveMatch: !!payload.hasLiveMatch } : null;
    };

    void (async () => {
      try {
        if (!optionsInFlightRef.current) {
          optionsInFlightRef.current = performLoad().finally(() => {
            optionsInFlightRef.current = null;
          });
        }

        const result = await optionsInFlightRef.current;

        if (!result) {
          dispatch({ isLoadingNearbyOptions: false, nearbyOptions: [], hasLiveNearbyMatch: false });
          toast.error("We couldn't load nearby codes right now.");
          return;
        }

        dispatch({ isLoadingNearbyOptions: false, nearbyOptions: result.options, hasLiveNearbyMatch: result.hasLiveMatch });
      } catch {
        dispatch({ isLoadingNearbyOptions: false, nearbyOptions: [], hasLiveNearbyMatch: false });
        toast.error("We couldn't load nearby codes right now.");
      }
    })();
  }, [dispatch, resolveNearbyGeo]);

  /** Claims a tapped code from the options grid and moves the payer into a `payerMatch`. */
  const submitNearbyOption = useCallback(
    (code: string) => {
      if (!NEARBY_CODE_REGEX.test(code)) {
        toast.error("Choose a valid nearby code.");
        return;
      }

      const loadingToast = toast.loading("Requesting that nearby code...");

      void (async () => {
        try {
          const geo = await resolveNearbyGeo();
          const response = await fetchWithTimeout("/api/nearby/claim", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ code, ...(geo ?? {}) }),
          });

          const payload = (await response.json()) as {
            message?: string;
            reason?: "not_found" | "busy";
            handoff?: { code: string; expiresAt: number; amount: number | null; counterpartUsername: string | null };
          };

          toast.dismiss(loadingToast);

          if (!response.ok || !payload.handoff) {
            toast.error(payload.message ?? "That nearby code is unavailable.");
            // "busy" means the code is still live, just mid-handshake with
            // someone else - wait for the next scheduled poll instead of
            // refetching the same option back immediately.
            if (payload.reason !== "busy") {
              loadNearbyOptions();
            }
            return;
          }

          vibrate([80, 60, 80]);
          dispatch({
            payerMatch: {
              code: payload.handoff.code,
              status: "matched",
              ownerAccepted: false,
              payerAccepted: false,
              expiresAt: payload.handoff.expiresAt,
              amount: payload.handoff.amount,
              counterpartUsername: payload.handoff.counterpartUsername,
            },
            nearbyOptions: [],
            hasLiveNearbyMatch: false,
          });
        } catch {
          toast.dismiss(loadingToast);
          toast.error("We couldn't resolve that nearby code right now.");
        }
      })();
    },
    [dispatch, resolveNearbyGeo, loadNearbyOptions],
  );

  /** Payer's side of mutual accept - confirms the match and, once both sides have accepted, hands off to `generate-intent` with the resolved recipient. */
  const acceptPayerMatch = useCallback(() => {
    const code = stateRef.current.payerMatch?.code;
    if (!code) return;

    void (async () => {
      try {
        const response = await fetchWithTimeout("/api/nearby/accept", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code }),
        });

        const payload = (await response.json()) as {
          message?: string;
          match?: {
            status: "published" | "matched" | "confirmed";
            ownerAccepted: boolean;
            payerAccepted: boolean;
            counterpartUsername: string | null;
            recipient?: NonNullable<Mou3amlaState["recipientPreview"]>;
          };
        };

        if (!response.ok || !payload.match) {
          toast.error(payload.message ?? "We couldn't confirm that match.");
          return;
        }

        if (payload.match.status === "confirmed" && payload.match.recipient) {
          vibrate(200);
          dispatch({
            recipientInput: payload.match.recipient.username,
            recipientPreview: payload.match.recipient,
            screen: "generate-intent",
            scanManualInput: "",
            payerMatch: null,
          });
          toast.success(`Nearby match confirmed: @${payload.match.recipient.username}`);
          return;
        }

        dispatch((s) =>
          s.payerMatch
            ? {
                payerMatch: {
                  ...s.payerMatch,
                  ownerAccepted: payload.match!.ownerAccepted,
                  payerAccepted: payload.match!.payerAccepted,
                  counterpartUsername: payload.match!.counterpartUsername,
                },
              }
            : null,
        );
      } catch {
        toast.error("We couldn't confirm that match right now.");
      }
    })();
  }, [dispatch, stateRef]);

  /** Owner's side of mutual accept - mirrors `acceptPayerMatch`. */
  const acceptOwnerMatch = useCallback(() => {
    const code = stateRef.current.nearbyHandoff?.code;
    if (!code) return;

    void (async () => {
      try {
        const response = await fetchWithTimeout("/api/nearby/accept", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code }),
        });

        const payload = (await response.json()) as {
          message?: string;
          match?: { status: "published" | "matched" | "confirmed"; ownerAccepted: boolean; payerAccepted: boolean; counterpartUsername: string | null };
        };

        if (!response.ok || !payload.match) {
          toast.error(payload.message ?? "We couldn't confirm that match.");
          return;
        }

        if (payload.match.status === "confirmed") vibrate(200);

        dispatch((s) =>
          s.nearbyHandoff
            ? {
                nearbyHandoff: {
                  ...s.nearbyHandoff,
                  status: payload.match!.status,
                  ownerAccepted: payload.match!.ownerAccepted,
                  payerAccepted: payload.match!.payerAccepted,
                  counterpartUsername: payload.match!.counterpartUsername,
                },
              }
            : null,
        );
      } catch {
        toast.error("We couldn't confirm that match right now.");
      }
    })();
  }, [dispatch, stateRef]);

  /** Payer-side self-heal: a match nobody acts on has no event to catch it, so a client-side timeout (see `scan-qr-screen.tsx`) calls this once `expiresAt` passes. */
  const expirePayerMatch = useCallback(() => {
    dispatch((s) => (s.payerMatch ? { payerMatch: null, nearbyOptions: [], hasLiveNearbyMatch: false } : null));
    toast.error("That nearby match expired. Choose another code.");
  }, [dispatch]);

  const cancelPayerMatch = useCallback(() => {
    dispatch({ payerMatch: null });

    void (async () => {
      try {
        await fetchWithTimeout("/api/nearby/cancel", { method: "POST" });
      } catch {
        // The stale-match TTL still catches this within NEARBY_HANDSHAKE_TTL_MS.
      }
    })();

    loadNearbyOptions();
  }, [dispatch, loadNearbyOptions]);

  const cancelOwnerMatch = useCallback(() => {
    void (async () => {
      try {
        await fetchWithTimeout("/api/nearby/cancel", { method: "POST" });
      } catch {
        // The stale-match TTL still catches this within NEARBY_HANDSHAKE_TTL_MS.
      }
    })();

    goHome();
  }, [goHome]);

  /**
   * Subscribes to Supabase Realtime `postgres_changes` on `nearby_handoffs`
   * for the given role, so both phones learn about a claim/accept/cancel the
   * instant it's written instead of on the next poll. Returns an unsubscribe
   * cleanup function.
   */
  const startNearbyRealtime = useCallback(
    (role: "owner" | "payer") => {
      const userId = stateRef.current.profile.id;
      if (!userId) return () => {};

      let cancelled = false;
      const supabase = createClient();

      // Owner-only: the raw realtime row carries no username, so once a payer
      // claims this owner's code, fetch it once via /api/nearby/status.
      const fetchCounterpartUsername = async (code: string) => {
        try {
          const response = await fetchWithTimeout(`/api/nearby/status?code=${encodeURIComponent(code)}`, { cache: "no-store" });
          if (!response.ok) return;
          const payload = (await response.json()) as { match?: { counterpartUsername?: string | null } };
          if (cancelled || payload.match?.counterpartUsername === undefined) return;
          dispatch((s) =>
            s.nearbyHandoff ? { nearbyHandoff: { ...s.nearbyHandoff, counterpartUsername: payload.match!.counterpartUsername ?? null } } : null,
          );
        } catch {
          // Best-effort, see comment above.
        }
      };

      const resolveConfirmedRecipient = async (code: string) => {
        try {
          const response = await fetchWithTimeout(`/api/nearby/status?code=${encodeURIComponent(code)}`, { cache: "no-store" });
          if (!response.ok) return;
          const payload = (await response.json()) as {
            match?: { recipient?: NonNullable<Mou3amlaState["recipientPreview"]> };
          };
          if (cancelled || !payload.match?.recipient) return;

          vibrate(200);
          dispatch((s) =>
            s.payerMatch
              ? {
                  recipientInput: payload.match!.recipient!.username,
                  recipientPreview: payload.match!.recipient!,
                  screen: "generate-intent",
                  scanManualInput: "",
                  payerMatch: null,
                }
              : null,
          );
        } catch {
          // Passive path only - the manual "Accept this match" tap already
          // resolves the recipient on success.
        }
      };

      const handleChange = (row: NearbyHandoffRealtimeRow | null) => {
        if (cancelled) return;

        if (role === "owner") {
          if (!row) {
            dispatch((s) => (s.nearbyHandoff ? { nearbyHandoff: null } : null));
            return;
          }
          const previousStatus = stateRef.current.nearbyHandoff?.status;
          if (previousStatus === "published" && row.status !== "published") {
            vibrate([80, 60, 80]);
            void fetchCounterpartUsername(row.challenge_code);
          }
          // Distinct haptic beat for "the payer just accepted their side too".
          if (!stateRef.current.nearbyHandoff?.payerAccepted && row.payer_accepted_at) {
            vibrate([50, 40, 50]);
          }
          dispatch((s) =>
            s.nearbyHandoff
              ? {
                  nearbyHandoff: {
                    ...s.nearbyHandoff,
                    code: row.challenge_code,
                    expiresAt: new Date(row.expires_at).getTime(),
                    status: row.status,
                    ownerAccepted: !!row.owner_accepted_at,
                    payerAccepted: !!row.payer_accepted_at,
                    amount: row.amount,
                  },
                }
              : null,
          );
          return;
        }

        if (!row) {
          dispatch((s) => (s.payerMatch ? { payerMatch: null, nearbyOptions: [], hasLiveNearbyMatch: false } : null));
          toast.error("That nearby match expired or was cancelled. Choose another code.");
          return;
        }

        if (row.status === "confirmed") {
          void resolveConfirmedRecipient(row.challenge_code);
          return;
        }

        if (!stateRef.current.payerMatch?.ownerAccepted && row.owner_accepted_at) {
          vibrate([50, 40, 50]);
        }

        dispatch((s) =>
          s.payerMatch
            ? { payerMatch: { ...s.payerMatch, ownerAccepted: !!row.owner_accepted_at, payerAccepted: !!row.payer_accepted_at, amount: row.amount } }
            : null,
        );
      };

      const ownerFilter = `owner_user_id=eq.${userId}`;
      const payerFilter = `payer_user_id=eq.${userId}`;

      const channel = supabase
        .channel(`nearby-handoffs:${role}:${userId}`)
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "nearby_handoffs", filter: role === "owner" ? ownerFilter : payerFilter }, (payload) =>
          handleChange(payload.new as NearbyHandoffRealtimeRow),
        )
        .on("postgres_changes", { event: "DELETE", schema: "public", table: "nearby_handoffs", filter: role === "owner" ? ownerFilter : payerFilter }, () =>
          handleChange(null),
        )
        .subscribe((status, err) => {
          // `cancelled` is already true during expected teardown (Strict Mode,
          // fast remount), so only log a genuine subscription failure.
          if (cancelled) return;
          if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
            console.error(`[realtime-nearby] subscription ${status}`, err);
          }
        });

      return () => {
        cancelled = true;
        void supabase.removeChannel(channel);
      };
    },
    [dispatch, stateRef],
  );

  return {
    startQrRotation,
    startNearbyPublishRotation,
    setNearbyHostAmount,
    commitNearbyHostAmount,
    loadNearbyOptions,
    submitNearbyOption,
    acceptPayerMatch,
    acceptOwnerMatch,
    cancelPayerMatch,
    cancelOwnerMatch,
    expirePayerMatch,
    startNearbyRealtime,
  };
}
