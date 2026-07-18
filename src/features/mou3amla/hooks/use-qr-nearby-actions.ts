import { useCallback, type RefObject } from "react";
import { toast } from "sonner";
import type { CoarseLocation } from "@/features/payments/lib/geolocation";
import { QR_TOKEN_TTL_MS } from "@/features/payments/constants";
import type { NearbyHandoff, QrToken } from "@/features/payments/types";
import type { Mou3amlaState } from "@/features/mou3amla/types";
import type { Patch } from "@/features/mou3amla/hooks/reducer";
import { vibrate } from "@/features/mou3amla/hooks/utils";
import { fetchWithTimeout } from "@/lib/fetch-with-timeout";

const NEARBY_POLL_INTERVAL_MS = 1500;

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
  const startQrRotation = useCallback(() => {
    let cancelled = false;
    let didShowQrError = false;
    let didShowNearbyError = false;

    const refresh = async () => {
      // The QR mint must never wait on the (possibly 5s-timeout) geolocation
      // prompt - only the nearby publish call needs coarse location, so it
      // resolves that independently while QR minting fires immediately.
      const qrPromise = fetchWithTimeout("/api/qr/mint", { method: "POST", cache: "no-store" });
      const nearbyPromise = resolveNearbyGeo().then((geo) =>
        fetchWithTimeout("/api/nearby/publish", {
          method: "POST",
          cache: "no-store",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(geo ?? {}),
        }),
      );

      const [qrResult, nearbyResult] = await Promise.allSettled([qrPromise, nearbyPromise]);

      let qrToken: QrToken | null = null;
      let nearbyHandoff: NearbyHandoff | null = null;

      if (qrResult.status === "fulfilled") {
        const payload = (await qrResult.value.json()) as { message?: string; qrToken?: QrToken };
        if (qrResult.value.ok && payload.qrToken) {
          qrToken = payload.qrToken;
          didShowQrError = false;
        }
      }

      if (nearbyResult.status === "fulfilled") {
        const payload = (await nearbyResult.value.json()) as { message?: string; handoff?: NearbyHandoff };
        if (nearbyResult.value.ok && payload.handoff) {
          nearbyHandoff = payload.handoff;
          didShowNearbyError = false;
        }
      }

      if (!cancelled) {
        dispatch({ qrToken, nearbyHandoff });
      }

      if (!qrToken && !didShowQrError) {
        toast.error("We couldn't mint a secure QR code right now.");
        didShowQrError = true;
      }

      if (!nearbyHandoff && !didShowNearbyError) {
        toast.error("We couldn't publish the nearby 3-digit code right now.");
        didShowNearbyError = true;
      }
    };

    void refresh();

    const interval = setInterval(() => {
      void refresh();
    }, QR_TOKEN_TTL_MS);
    timers.current.add(interval);

    return () => {
      cancelled = true;
      clearInterval(interval);
      timers.current.delete(interval);
    };
  }, [dispatch, resolveNearbyGeo, timers]);

  const loadNearbyOptions = useCallback(() => {
    dispatch({ isLoadingNearbyOptions: true });

    void (async () => {
      try {
        const geo = await resolveNearbyGeo();
        const query = geo ? `?lat=${geo.lat}&lng=${geo.lng}` : "";
        const response = await fetchWithTimeout(`/api/nearby/options${query}`, {
          method: "GET",
          cache: "no-store",
        });
        const payload = (await response.json()) as { message?: string; options?: string[] };

        if (!response.ok || !payload.options) {
          dispatch({ isLoadingNearbyOptions: false, nearbyOptions: [] });
          toast.error(payload.message ?? "We couldn't load nearby codes right now.");
          return;
        }

        dispatch({
          isLoadingNearbyOptions: false,
          nearbyOptions: payload.options,
        });
      } catch {
        dispatch({ isLoadingNearbyOptions: false, nearbyOptions: [] });
        toast.error("We couldn't load nearby codes right now.");
      }
    })();
  }, [dispatch, resolveNearbyGeo]);

  const submitNearbyOption = useCallback(
    (code: string) => {
      if (!/^\d{3}$/.test(code)) {
        toast.error("Choose a valid 3-digit nearby code.");
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
            handoff?: { code: string };
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

  const startNearbyMatchPolling = useCallback(
    (role: "owner" | "payer") => {
      let cancelled = false;

      const tick = async () => {
        const code = role === "owner" ? stateRef.current.nearbyHandoff?.code : stateRef.current.payerMatch?.code;
        if (!code) return;

        try {
          const response = await fetchWithTimeout(`/api/nearby/status?code=${encodeURIComponent(code)}`, { cache: "no-store" });
          if (!response.ok) {
            if (response.status === 404 && !cancelled) {
              if (role === "owner") {
                dispatch((s) => (s.nearbyHandoff?.code === code ? { nearbyHandoff: null } : null));
              } else {
                dispatch((s) => (s.payerMatch?.code === code ? { payerMatch: null, nearbyOptions: [] } : null));
                toast.error("That nearby match expired. Choose another code.");
              }
            }
            return;
          }

          const payload = (await response.json()) as {
            match?: { status: "published" | "matched" | "confirmed"; ownerAccepted: boolean; payerAccepted: boolean; recipient?: NonNullable<Mou3amlaState["recipientPreview"]> };
          };
          if (cancelled || !payload.match) return;

          if (role === "owner") {
            const previousStatus = stateRef.current.nearbyHandoff?.status;
            if (previousStatus === "published" && payload.match.status !== "published") {
              vibrate([80, 60, 80]);
            }
            dispatch((s) =>
              s.nearbyHandoff
                ? { nearbyHandoff: { ...s.nearbyHandoff, status: payload.match!.status, ownerAccepted: payload.match!.ownerAccepted, payerAccepted: payload.match!.payerAccepted } }
                : null,
            );
            return;
          }

          if (payload.match.status === "confirmed" && payload.match.recipient) {
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
            return;
          }

          dispatch((s) =>
            s.payerMatch ? { payerMatch: { ...s.payerMatch, ownerAccepted: payload.match!.ownerAccepted, payerAccepted: payload.match!.payerAccepted } } : null,
          );
        } catch {
          // Transient poll failure - the next tick will retry.
        }
      };

      void tick();
      const interval = setInterval(() => void tick(), NEARBY_POLL_INTERVAL_MS);
      timers.current.add(interval);

      return () => {
        cancelled = true;
        clearInterval(interval);
        timers.current.delete(interval);
      };
    },
    [dispatch, stateRef, timers],
  );

  return {
    startQrRotation,
    loadNearbyOptions,
    submitNearbyOption,
    acceptPayerMatch,
    acceptOwnerMatch,
    cancelPayerMatch,
    cancelOwnerMatch,
    startNearbyMatchPolling,
  };
}
