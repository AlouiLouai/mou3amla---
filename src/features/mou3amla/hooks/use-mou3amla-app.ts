"use client";

import { useCallback, useEffect, useReducer, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { type CoarseLocation, getCoarseLocation } from "@/features/payments/lib/geolocation";
import type { HandoffMode, InitialMou3amlaUser, Mou3amlaState } from "@/features/mou3amla/types";
import { PROVIDERS } from "@/features/wallets/constants";
import { initialState, reducer } from "@/features/mou3amla/hooks/reducer";
import { useNotificationActions } from "@/features/mou3amla/hooks/use-notification-actions";
import { usePaymentActions } from "@/features/mou3amla/hooks/use-payment-actions";
import { useQrNearbyActions } from "@/features/mou3amla/hooks/use-qr-nearby-actions";
import { useWalletActions } from "@/features/mou3amla/hooks/use-wallet-actions";
import { fetchWithTimeout } from "@/lib/fetch-with-timeout";

export function useMou3amlaApp(initialUser?: InitialMou3amlaUser) {
  const router = useRouter();
  const [state, dispatch] = useReducer(reducer, initialState(initialUser));
  const timers = useRef(new Set<ReturnType<typeof setTimeout>>());
  const stateRef = useRef(state);
  const nearbyGeoRef = useRef<CoarseLocation | null | undefined>(undefined);

  // Resolves once per app session (cached in a ref) so re-entering the nearby
  // flow doesn't re-prompt for location permission on every publish/poll tick.
  const resolveNearbyGeo = useCallback(async (): Promise<CoarseLocation | null> => {
    if (nearbyGeoRef.current === undefined) {
      nearbyGeoRef.current = await getCoarseLocation();
    }
    return nearbyGeoRef.current;
  }, []);

  useEffect(() => {
    stateRef.current = state;
  });

  useEffect(() => {
    const activeTimers = timers.current;
    return () => {
      for (const id of activeTimers) {
        clearTimeout(id);
        clearInterval(id);
      }
    };
  }, []);

  // Polls Didit's verification status while a session is pending: fast at
  // first (2.5s), then backs off to 12s, capped at 10 attempts. The webhook
  // in `/api/didit/webhook` is the actual source of truth - this just closes
  // the gap for a user who's still looking at the screen.
  useEffect(() => {
    if (state.profile.verificationStatus !== "pending" || !state.profile.diditSessionId) {
      return;
    }

    const activeTimers = timers.current;
    let cancelled = false;
    let pollTimer: ReturnType<typeof setTimeout> | null = null;
    let attempts = 0;

    const schedulePoll = () => {
      if (cancelled || attempts >= 10) {
        return;
      }

      pollTimer = setTimeout(() => {
        void pollStatus();
      }, attempts === 0 ? 2500 : 12000);
      activeTimers.add(pollTimer);
    };

    const pollStatus = async () => {
      attempts += 1;

      try {
        const response = await fetchWithTimeout("/api/didit/status", {
          method: "GET",
          cache: "no-store",
        });
        const payload = (await response.json()) as {
          profile?: {
            verificationStatus: Mou3amlaState["profile"]["verificationStatus"];
            diditLatestStatus: string | null;
            diditSessionId: string | null;
          };
        };

        if (!response.ok || !payload.profile || cancelled) {
          schedulePoll();
          return;
        }

        const currentProfile = stateRef.current.profile;
        const nextProfile = payload.profile;
        const statusChanged = currentProfile.verificationStatus !== nextProfile.verificationStatus;
        const latestChanged = currentProfile.diditLatestStatus !== nextProfile.diditLatestStatus;

        if (statusChanged || latestChanged) {
          dispatch((s) => ({
            profile: {
              ...s.profile,
              verificationStatus: nextProfile.verificationStatus,
              diditLatestStatus: nextProfile.diditLatestStatus,
              diditSessionId: nextProfile.diditSessionId,
            },
          }));

          if (currentProfile.verificationStatus !== "verified" && nextProfile.verificationStatus === "verified") {
            toast.success("Identity verified. RIB linking is now unlocked.");
          }

          if (currentProfile.verificationStatus !== "rejected" && nextProfile.verificationStatus === "rejected") {
            toast.error("Didit requested another verification attempt.");
          }
        }

        if (nextProfile.verificationStatus === "pending") {
          schedulePoll();
        }
      } catch {
        schedulePoll();
      }
    };

    schedulePoll();

    return () => {
      cancelled = true;
      if (pollTimer) {
        clearTimeout(pollTimer);
        activeTimers.delete(pollTimer);
      }
    };
  }, [state.profile.diditSessionId, state.profile.verificationStatus]);

  const goHome = useCallback(() => dispatch({ screen: "home", linkOpen: false, payerMatch: null }), []);
  const goAccounts = useCallback(() => dispatch({ screen: "accounts" }), []);
  const goActivity = useCallback(() => dispatch({ screen: "activity" }), []);
  const goProfile = useCallback(() => dispatch({ screen: "profile" }), []);
  const goNotifications = useCallback(() => dispatch({ screen: "notifications" }), []);
  const goInvoices = useCallback(() => dispatch({ screen: "invoices" }), []);
  const goGenerateIntent = useCallback(() => {
    if (!stateRef.current.wallets.length) {
      toast.error("Link at least one destination account before sending money.");
      return;
    }

    dispatch({ screen: "generate-intent", amount: "", recipientInput: "", recipientPreview: null });
  }, []);
  const goReceiveQr = useCallback((mode: HandoffMode = "qr") => {
    if (!stateRef.current.wallets.length) {
      toast.error("Link an account first so Mou3amla knows where to route incoming payments.");
      return;
    }

    dispatch({ screen: "receive-qr", qrToken: null, nearbyHandoff: null, initialHandoffMode: mode });
  }, []);
  const goScanQr = useCallback((mode: HandoffMode = "qr") => {
    if (!stateRef.current.wallets.length) {
      toast.error("Link an account first so Mou3amla can route your outgoing payment.");
      return;
    }

    dispatch({
      screen: "scan-qr",
      scanManualInput: "",
      nearbyOptions: [],
      isLoadingNearbyOptions: false,
      payerMatch: null,
      initialHandoffMode: mode,
    });
  }, []);

  const qrNearbyActions = useQrNearbyActions({ dispatch, stateRef, timers, resolveNearbyGeo, goHome });
  const walletActions = useWalletActions({ dispatch, stateRef, router });
  const paymentActions = usePaymentActions({ dispatch, stateRef });
  const notificationActions = useNotificationActions({ dispatch, stateRef });

  const account = {
    profile: state.profile,
    wallets: state.wallets,
    sourceWalletId: state.sourceWalletId,
    activityLog: state.activityLog,
    notifications: state.notifications,
    invoices: state.invoices,
  };

  return {
    state,
    derived: {
      account,
      sourceWallet: state.wallets.find((wallet) => wallet.id === state.sourceWalletId) ?? null,
      hasAnyWallets: state.wallets.length > 0,
      unreadNotifications: state.notifications.filter((item) => item.unread).length,
      availableProviders: PROVIDERS.filter((provider) => !state.wallets.some((wallet) => wallet.providerId === provider.id)),
      linkProvider: PROVIDERS.find((provider) => provider.id === state.linkProviderId) ?? null,
    },
    actions: {
      goHome,
      goAccounts,
      goActivity,
      goProfile,
      goNotifications,
      goInvoices,
      goGenerateIntent,
      goReceiveQr,
      goScanQr,
      ...qrNearbyActions,
      ...walletActions,
      ...paymentActions,
      ...notificationActions,
    },
  };
}

export type UseMou3amlaApp = ReturnType<typeof useMou3amlaApp>;
