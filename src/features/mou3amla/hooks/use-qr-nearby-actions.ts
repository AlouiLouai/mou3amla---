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
  // Lives at the hook level, shared across every separate call to a given
  // rotation starter - specifically React Strict Mode's dev-only mount ->
  // cleanup -> mount, which invokes the effect (and so this) twice in a row
  // for the same real mount. Tagging each call and trusting "whichever was
  // issued last" is not enough: with two independent requests in flight,
  // network/server timing decides which one's write actually lands last in
  // the database, and that is not guaranteed to match which one was issued
  // last client-side - so the client could confidently display a code the
  // database no longer agrees with. Coalescing every concurrent refresh()
  // call into one shared in-flight promise removes the ambiguity outright:
  // there is only ever one publish/mint request in flight at a time, so
  // every caller ends up awaiting and applying the exact same result.
  const qrRotationInFlightRef = useRef<Promise<QrToken | null> | null>(null);
  const nearbyRotationInFlightRef = useRef<Promise<NearbyHandoff | null> | null>(null);

  // QR image and nearby code rotate on independent cadences - the QR token
  // stays legible on screen for QR_TOKEN_TTL_MS (60s), while the nearby code
  // is deliberately much shorter-lived (NEARBY_CODE_TTL_MS) as its primary
  // anti-brute-force control. Re-minting the QR every time the nearby code
  // rotates would needlessly reset its own countdown and burn through its
  // rate limit for no reason.
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

  // Shared by the automatic 10s rotation below and commitNearbyHostAmount's
  // "I just changed the amount, push it now" call - both go through the same
  // in-flight-coalescing ref so a manual push racing an in-progress rotation
  // tick can't produce two concurrent publish requests. Reads the host's
  // current amount input fresh from stateRef every call, so whichever one
  // fires next (rotation tick or manual commit) always sends the latest
  // value - there's no separate "pending amount to send" to fall out of sync.
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

  // Pushes the host's just-typed amount immediately instead of waiting for
  // the next scheduled rotation tick (up to NEARBY_CODE_TTL_MS later) -
  // /api/nearby/publish itself already no-ops once a payer has claimed the
  // code (its "existing.status !== 'published'" early return just reports
  // the current state back unchanged), so this is safe to call any time the
  // host is still just broadcasting, and a no-op otherwise.
  const commitNearbyHostAmount = useCallback(async () => {
    const nearbyHandoff = await publishNearby();
    if (nearbyHandoff) {
      dispatch({ nearbyHandoff });
    } else {
      toast.error("We couldn't update the amount right now.");
    }
  }, [dispatch, publishNearby]);

  // Same coalescing as the rotations above - the auto-refresh interval, a
  // manual "Refresh" tap, and React Strict Mode's dev-only double-invoke can
  // all trigger this within the same instant; without this guard that's
  // multiple overlapping requests instead of one.
  const optionsInFlightRef = useRef<Promise<{ options: string[]; hasLiveMatch: boolean } | null> | null>(null);

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
            // "busy" means the code is still legitimately live - its owner is
            // just mid-handshake with someone else right now - so refetching
            // immediately would show the exact same option back. Let the
            // next scheduled poll (NEARBY_OPTIONS_REFRESH_MS) pick up the
            // change once that handshake actually resolves. Any other
            // reason (not_found: rotated, expired, out of range) means the
            // grid the payer is looking at is already stale, so refresh now
            // instead of leaving it stuck showing options the server just
            // rejected.
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

  // Realtime only fires on an actual write (claim/accept/cancel) - a match
  // nobody acts on just sits past its own expiresAt with no event at all.
  // The owner side self-heals within at most NEARBY_CODE_TTL_MS via its own
  // publish rotation; the payer has no equivalent, so this is the payer's
  // only path back to a usable state once their matched code goes stale.
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
        // The stale match TTL will still catch this within NEARBY_HANDSHAKE_TTL_MS.
      }
    })();

    loadNearbyOptions();
  }, [dispatch, loadNearbyOptions]);

  const cancelOwnerMatch = useCallback(() => {
    void (async () => {
      try {
        await fetchWithTimeout("/api/nearby/cancel", { method: "POST" });
      } catch {
        // The stale match TTL will still catch this within NEARBY_HANDSHAKE_TTL_MS.
      }
    })();

    goHome();
  }, [goHome]);

  // Replaces the old 1.5s poll with a Supabase Realtime subscription on
  // nearby_handoffs (see the nearby_handoffs_select_participant RLS policy
  // and the supabase_realtime publication entry added alongside it) - both
  // phones now learn about a claim/accept/confirm the instant it's written,
  // not up to 1.5s later. Two role-scoped filters cover both directions a
  // single user can be part of a handoff (as owner, as payer); a cancel
  // (row delete) reaches the *other* side the same way a status change does,
  // which the previous poll could only infer from a 404 up to 1.5s late.
  const startNearbyRealtime = useCallback(
    (role: "owner" | "payer") => {
      const userId = stateRef.current.profile.id;
      if (!userId) return () => {};

      let cancelled = false;
      const supabase = createClient();

      // Owner-only: the realtime row itself carries no username (it's the
      // raw DB row, no join), so the moment a payer claims this owner's code
      // the owner needs one extra fetch to learn who it was - same
      // /api/nearby/status endpoint the confirmed-recipient resolve below
      // already uses, just reading a narrower field off it. Best-effort: the
      // username is a confirmation nicety here, not required to proceed, and
      // acceptOwnerMatch's own response carries it too as a backstop.
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
          // The manual "Accept this match" tap already resolves the recipient
          // on success - this is only the passive, no-tap-needed path.
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
          // A lighter tick for "the payer just accepted their side too" -
          // the AirDrop-style connecting animation (NearbyConnecting) needs
          // its own haptic beat distinct from the initial match buzz and the
          // final confirm buzz, same as real AirDrop ticks at each stage.
          if (!stateRef.current.nearbyHandoff?.payerAccepted && row.payer_accepted_at) {
            vibrate([50, 40, 50]);
          }
          // Also syncs code/expiresAt, not just status/accepted flags - a
          // backstop against the rare case where two of this owner's own
          // publish requests raced (e.g. React Strict Mode's dev-only
          // double-mount) and the client ended up holding a code that a
          // later request already superseded in the database. Whichever
          // upsert actually committed last is what Postgres reports here,
          // so this self-corrects within moments regardless.
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
          // React tearing this effect down (Strict Mode in dev, or a fast
          // remount) triggers removeChannel() below, which reports its own
          // status as CLOSED - expected teardown, not a failure. `cancelled`
          // is already set at that point, so skip logging it as an error.
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
