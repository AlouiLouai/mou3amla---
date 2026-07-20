"use client";

import { useCallback, useEffect, useReducer, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { type CoarseLocation, getCoarseLocation } from "@/features/payments/lib/geolocation";
import type { HandoffMode, InitialMou3amlaUser } from "@/features/mou3amla/types";
import { PROVIDERS } from "@/features/wallets/constants";
import { useRealtimeNotifications } from "@/features/notifications/hooks/use-realtime-notifications";
import { initialState, reducer } from "@/features/mou3amla/hooks/reducer";
import { useNotificationActions } from "@/features/mou3amla/hooks/use-notification-actions";
import { usePaymentActions } from "@/features/mou3amla/hooks/use-payment-actions";
import { useQrNearbyActions } from "@/features/mou3amla/hooks/use-qr-nearby-actions";
import { getMockCheckoutWallets, getPreferredSendWalletId, getRecentContacts } from "@/features/mou3amla/hooks/utils";
import { useWalletActions } from "@/features/mou3amla/hooks/use-wallet-actions";

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

  useEffect(() => {
    if (!initialUser?.initialScreen && !initialUser?.highlightedActivityId) return;
    router.replace("/home", { scroll: false });
  }, [initialUser?.highlightedActivityId, initialUser?.initialScreen, router]);

  // Delivers "payment received" (and any other) notification the instant it's
  // inserted, instead of only on the next full page load - see
  // use-realtime-notifications.ts. A payment_received event is emitted only
  // once the provider checkout is actually confirmed, and it carries the
  // recipient's own Activity row in metadata so they can jump straight to
  // Activity and see the confirmed transfer highlighted.
  useRealtimeNotifications(
    state.profile.id,
    state.notifications.map((item) => item.id),
    useCallback(
      ({ notification, activity, transactionId }) => {
        if (stateRef.current.notifications.some((item) => item.id === notification.id)) {
          return;
        }

        dispatch((s) => ({ notifications: [notification, ...s.notifications] }));

        if (notification.type === "payment_received") {
          const fallbackActivityId = activity?.id ?? transactionId ?? null;

          // The sender could only reach this point because both accounts are
          // identity-verified: linking a source destination requires the
          // sender's own verification_status === "verified", and this
          // recipient's own verified status is what let createPaymentIntent
          // accept them in the first place. A real enforced guarantee, not a
          // trust claim invented for the toast.
          toast.success(notification.title, {
            description: `${notification.body} Routed between two identity-verified Mou3amla accounts.`,
          });

          dispatch((s) => ({
            activityLog: activity ? (s.activityLog.some((item) => item.id === activity.id) ? s.activityLog : [activity, ...s.activityLog]) : s.activityLog,
            screen: "activity",
            highlightedActivityId: fallbackActivityId,
          }));
        }
      },
      [dispatch],
    ),
  );

  const clearActivityHighlight = useCallback(() => dispatch({ highlightedActivityId: null }), []);
  const goHome = useCallback(() => dispatch({ screen: "home", linkOpen: false, payerMatch: null }), []);
  const goAccounts = useCallback(() => dispatch({ screen: "accounts" }), []);
  const goActivity = useCallback(() => dispatch({ screen: "activity" }), []);
  const goProfile = useCallback(() => dispatch({ screen: "profile" }), []);
  const goNotifications = useCallback(() => dispatch({ screen: "notifications" }), []);
  const goInvoices = useCallback(() => dispatch({ screen: "invoices" }), []);
  const goContacts = useCallback(() => dispatch({ screen: "contacts" }), []);
  const goGenerateIntent = useCallback(() => {
    if (!stateRef.current.wallets.length) {
      toast.error("Link at least one destination account before sending money.");
      return;
    }

    const sendSourceWalletId = getPreferredSendWalletId(
      stateRef.current.wallets,
      stateRef.current.sendSourceWalletId || stateRef.current.sourceWalletId,
    );

    if (!sendSourceWalletId) {
      toast.error("Link an available wallet or bank route first to open the internal mock checkout.");
      return;
    }

    dispatch({ screen: "generate-intent", amount: "", recipientInput: "", recipientPreview: null, sendSourceWalletId });
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

    if (!getMockCheckoutWallets(stateRef.current.wallets).length) {
      toast.error("Link an available wallet or bank route first to open the internal mock checkout after scanning.");
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

  const allContacts = getRecentContacts(state.activityLog);

  return {
    state,
    derived: {
      account,
      sourceWallet: state.wallets.find((wallet) => wallet.id === state.sourceWalletId) ?? null,
      sendSourceWallet: state.wallets.find((wallet) => wallet.id === state.sendSourceWalletId) ?? null,
      supportedSendWallets: getMockCheckoutWallets(state.wallets),
      hasAnyWallets: state.wallets.length > 0,
      unreadNotifications: state.notifications.filter((item) => item.unread).length,
      availableProviders: PROVIDERS.filter((provider) => !state.wallets.some((wallet) => wallet.providerId === provider.id)),
      linkProvider: PROVIDERS.find((provider) => provider.id === state.linkProviderId) ?? null,
      recentContacts: allContacts.slice(0, 8),
      allContacts,
    },
    actions: {
      clearActivityHighlight,
      goHome,
      goAccounts,
      goActivity,
      goProfile,
      goNotifications,
      goInvoices,
      goContacts,
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
