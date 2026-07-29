"use client";

import { useCallback, useEffect, useReducer, useRef } from "react";
import { useRouter } from "next/navigation";
import { usePostHog } from "posthog-js/react";
import { toast } from "@/lib/toast";
import { type CoarseLocation, getCoarseLocation } from "@/features/payments/lib/geolocation";
import { getLastScanRole, setLastScanRole } from "@/features/payments/lib/last-scan-role";
import type { HandoffMode, InitialMou3amlaUser } from "@/features/mou3amla/types";
import { PROVIDERS } from "@/features/wallets/constants";
import { useRealtimeNotifications } from "@/features/notifications/hooks/use-realtime-notifications";
import { initialState, reducer } from "@/features/mou3amla/hooks/reducer";
import { useNotificationActions } from "@/features/mou3amla/hooks/use-notification-actions";
import { usePaymentActions } from "@/features/mou3amla/hooks/use-payment-actions";
import { useQrNearbyActions } from "@/features/mou3amla/hooks/use-qr-nearby-actions";
import { getCheckoutEnabledWallets, getPreferredSendWalletId, getRecentContacts } from "@/features/mou3amla/hooks/utils";
import { useWalletActions } from "@/features/mou3amla/hooks/use-wallet-actions";

/**
 * Root state/actions hook for the authenticated shell - owns the reducer,
 * derived selectors, and every screen-navigation/QR/nearby/wallet/payment
 * action, assembled from the feature-specific `use*Actions` hooks below.
 */
export function useMou3amlaApp(initialUser?: InitialMou3amlaUser) {
  const router = useRouter();
  const [state, dispatch] = useReducer(reducer, initialState(initialUser));
  const timers = useRef(new Set<ReturnType<typeof setTimeout>>());
  const stateRef = useRef(state);
  const nearbyGeoRef = useRef<CoarseLocation | null | undefined>(undefined);
  const posthog = usePostHog();

  // Identifies analytics events to the account; safe to call unconditionally
  // since usePostHog() no-ops when analytics is disabled (analytics-provider.tsx).
  useEffect(() => {
    if (!state.profile.id) return;
    posthog.identify(state.profile.id);
  }, [state.profile.id, posthog]);

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

  // Delivers a "payment received" (or other) notification the instant it's
  // inserted, instead of on next page load - see use-realtime-notifications.ts.
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

          // Both accounts are enforced-verified by this point (linking a
          // source destination and createPaymentIntent both require it).
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
      toast.error("Link an available wallet or bank route first to open a supported checkout.");
      return;
    }

    dispatch({ screen: "generate-intent", amount: "", recipientInput: "", recipientPreview: null, sendSourceWalletId });
  }, []);
  const goReceiveQr = useCallback((mode: HandoffMode = "qr") => {
    // Enforced here too, not just hidden in the UI: a tourist has no
    // Tunisian bank/wallet destination to receive into (see AccountType).
    if (stateRef.current.profile.accountType === "tourist") {
      toast.error("Visitor accounts can only send money in this demo - receiving needs a Tunisian bank/wallet destination.");
      return;
    }

    if (!stateRef.current.wallets.length) {
      toast.error("Link an account first so Mou3amla knows where to route incoming payments.");
      return;
    }

    setLastScanRole("receive");
    // Preserve an in-flight nearby handoff on re-entry (e.g. goScanSmart's
    // bottom-tab route back into a live match) - wiping it would blank the
    // screen and let startNearbyPublishRotation's mount effect race a stale
    // realtime update. Only a genuinely fresh entry resets it.
    const current = stateRef.current;
    const keepHandoff = mode === "nearby" && !!current.nearbyHandoff;
    dispatch({
      screen: "receive-qr",
      qrToken: null,
      nearbyHandoff: keepHandoff ? current.nearbyHandoff : null,
      nearbyHostAmount: keepHandoff ? current.nearbyHostAmount : "",
      initialHandoffMode: mode,
    });
  }, []);
  const goScanQr = useCallback((mode: HandoffMode = "qr") => {
    if (!stateRef.current.wallets.length) {
      toast.error("Link an account first so Mou3amla can route your outgoing payment.");
      return;
    }

    if (!getCheckoutEnabledWallets(stateRef.current.wallets).length) {
      toast.error("Link an available wallet or bank route first to open a supported checkout after scanning.");
      return;
    }

    setLastScanRole("send");
    // Mirrors goReceiveQr above - the payer has no server-side self-heal on
    // remount, so wiping payerMatch here would strand them with no way back
    // to a match already claimed/accepted.
    const current = stateRef.current;
    const keepPayerMatch = mode === "nearby" && !!current.payerMatch;
    dispatch({
      screen: "scan-qr",
      scanManualInput: "",
      nearbyOptions: keepPayerMatch ? current.nearbyOptions : [],
      hasLiveNearbyMatch: keepPayerMatch ? current.hasLiveNearbyMatch : false,
      isLoadingNearbyOptions: false,
      payerMatch: keepPayerMatch ? current.payerMatch : null,
      initialHandoffMode: mode,
    });
  }, []);
  /** Bottom nav's single "scan" tab: prefers a role with unfinished nearby business, else the last-used role, else defaults to "send". */
  const goScanSmart = useCallback(() => {
    const current = stateRef.current;

    if (current.nearbyHandoff && (current.nearbyHandoff.status === "matched" || current.nearbyHandoff.status === "confirmed")) {
      goReceiveQr("nearby");
      return;
    }

    if (current.payerMatch) {
      goScanQr("nearby");
      return;
    }

    if (getLastScanRole() === "receive") {
      goReceiveQr();
    } else {
      goScanQr();
    }
  }, [goReceiveQr, goScanQr]);

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
      supportedSendWallets: getCheckoutEnabledWallets(state.wallets),
      hasAnyWallets: state.wallets.length > 0,
      unreadNotifications: state.notifications.filter((item) => item.unread).length,
      // Tourists only ever see the one foreign-card provider; residents never see it.
      availableProviders: PROVIDERS.filter(
        (provider) =>
          !state.wallets.some((wallet) => wallet.providerId === provider.id) &&
          (state.profile.accountType === "tourist" ? !!provider.international : !provider.international),
      ),
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
      goScanSmart,
      ...qrNearbyActions,
      ...walletActions,
      ...paymentActions,
      ...notificationActions,
    },
  };
}

/** Shape returned by `useMou3amlaApp` - `{ state, derived, actions }`, threaded into every screen component as a single prop. */
export type UseMou3amlaApp = ReturnType<typeof useMou3amlaApp>;
