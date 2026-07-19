import { useCallback, useRef, type RefObject } from "react";
import { toast } from "sonner";
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

  const startNearbyPublishRotation = useCallback(() => {
    let cancelled = false;
    let didShowError = false;

    const performPublish = async (): Promise<NearbyHandoff | null> => {
      const geo = await resolveNearbyGeo();
      const response = await fetchWithTimeout("/api/nearby/publish", {
        method: "POST",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(geo ?? {}),
      });
      const payload = (await response.json()) as { message?: string; handoff?: NearbyHandoff };
      return response.ok && payload.handoff ? payload.handoff : null;
    };

    const refresh = async () => {
      if (!nearbyRotationInFlightRef.current) {
        nearbyRotationInFlightRef.current = performPublish().finally(() => {
          nearbyRotationInFlightRef.current = null;
        });
      }

      const nearbyHandoff = await nearbyRotationInFlightRef.current;

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
  }, [dispatch, resolveNearbyGeo, timers]);

  // Same coalescing as the rotations above - the auto-refresh interval, a
  // manual "Refresh" tap, and React Strict Mode's dev-only double-invoke can
  // all trigger this within the same instant; without this guard that's
  // multiple overlapping requests instead of one.
  const optionsInFlightRef = useRef<Promise<string[] | null> | null>(null);

  const loadNearbyOptions = useCallback(() => {
    dispatch({ isLoadingNearbyOptions: true });

    const performLoad = async (): Promise<string[] | null> => {
      const geo = await resolveNearbyGeo();
      const query = geo ? `?lat=${geo.lat}&lng=${geo.lng}` : "";
      const response = await fetchWithTimeout(`/api/nearby/options${query}`, {
        method: "GET",
        cache: "no-store",
      });
      const payload = (await response.json()) as { message?: string; options?: string[] };
      return response.ok && payload.options ? payload.options : null;
    };

    void (async () => {
      try {
        if (!optionsInFlightRef.current) {
          optionsInFlightRef.current = performLoad().finally(() => {
            optionsInFlightRef.current = null;
          });
        }

        const options = await optionsInFlightRef.current;

        if (!options) {
          dispatch({ isLoadingNearbyOptions: false, nearbyOptions: [] });
          toast.error("We couldn't load nearby codes right now.");
          return;
        }

        dispatch({ isLoadingNearbyOptions: false, nearbyOptions: options });
      } catch {
        dispatch({ isLoadingNearbyOptions: false, nearbyOptions: [] });
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
            handoff?: { code: string; expiresAt: number };
          };

          toast.dismiss(loadingToast);

          if (!response.ok || !payload.handoff) {
            toast.error(payload.message ?? "That nearby code is unavailable.");
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
            },
            nearbyOptions: [],
          });
        } catch {
          toast.dismiss(loadingToast);
          toast.error("We couldn't resolve that nearby code right now.");
        }
      })();
    },
    [dispatch, resolveNearbyGeo],
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
          match?: { status: "published" | "matched" | "confirmed"; ownerAccepted: boolean; payerAccepted: boolean; recipient?: NonNullable<Mou3amlaState["recipientPreview"]> };
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
          s.payerMatch ? { payerMatch: { ...s.payerMatch, ownerAccepted: payload.match!.ownerAccepted, payerAccepted: payload.match!.payerAccepted } } : null,
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
          match?: { status: "published" | "matched" | "confirmed"; ownerAccepted: boolean; payerAccepted: boolean };
        };

        if (!response.ok || !payload.match) {
          toast.error(payload.message ?? "We couldn't confirm that match.");
          return;
        }

        if (payload.match.status === "confirmed") vibrate(200);

        dispatch((s) =>
          s.nearbyHandoff
            ? { nearbyHandoff: { ...s.nearbyHandoff, status: payload.match!.status, ownerAccepted: payload.match!.ownerAccepted, payerAccepted: payload.match!.payerAccepted } }
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
    dispatch((s) => (s.payerMatch ? { payerMatch: null, nearbyOptions: [] } : null));
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
                  },
                }
              : null,
          );
          return;
        }

        if (!row) {
          dispatch((s) => (s.payerMatch ? { payerMatch: null, nearbyOptions: [] } : null));
          toast.error("That nearby match expired or was cancelled. Choose another code.");
          return;
        }

        if (row.status === "confirmed") {
          void resolveConfirmedRecipient(row.challenge_code);
          return;
        }

        dispatch((s) =>
          s.payerMatch ? { payerMatch: { ...s.payerMatch, ownerAccepted: !!row.owner_accepted_at, payerAccepted: !!row.payer_accepted_at } } : null,
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
