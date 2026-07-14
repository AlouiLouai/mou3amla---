"use client";

import { useCallback, useEffect, useReducer, useRef } from "react";
import { toast } from "sonner";
import { buildInvoice } from "@/features/invoices/lib/el-fatoora";
import { markAllNotificationsRead, markNotificationRead } from "@/features/notifications/server/actions";
import { QR_TOKEN_TTL_MS } from "@/features/payments/constants";
import { attemptNativeHandoff } from "@/features/payments/lib/deep-link";
import { buildTunpayUri } from "@/features/payments/lib/tunpay";
import { createPaymentIntent } from "@/features/payments/server/actions";
import type { NearbyHandoff, QrToken } from "@/features/payments/types";
import type { InitialSquadUser, SquadState } from "@/features/squad/types";
import { PROVIDERS } from "@/features/wallets/constants";
import { linkDestination, setPrimaryDestination } from "@/features/wallets/server/actions";
import type { LinkedWallet } from "@/features/wallets/types";

function makeConfetti() {
  const colors = ["#FF0083", "#FF8D28", "#050505", "#FFC4E3"];
  return Array.from({ length: 24 }, (_, i) => ({
    left: `${(Math.random() * 92 + 2).toFixed(1)}%`,
    delay: `${(Math.random() * 1.2).toFixed(2)}s`,
    dur: `${(1.6 + Math.random() * 1.2).toFixed(2)}s`,
    color: colors[i % colors.length],
  }));
}

function applyDefaultWallet(wallets: LinkedWallet[], selectedId: string) {
  return wallets.map((wallet) => ({
    ...wallet,
    isDefault: wallet.id === selectedId,
  }));
}

const NEARBY_POLL_INTERVAL_MS = 1500;

function vibrate(pattern: number | number[]) {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    navigator.vibrate(pattern);
  }
}

function initialState(initialUser?: InitialSquadUser): SquadState {
  return {
    screen: "home",
    linkOpen: false,
    linkStep: "provider",
    linkProviderId: null,
    linkIdentifierInput: "",
    linkConnectingId: null,
    recipientInput: "",
    recipientPreview: null,
    amount: "",
    currentIntent: null,
    qrToken: null,
    nearbyHandoff: null,
    payerMatch: null,
    nearbyOptions: [],
    isLoadingNearbyOptions: false,
    scanManualInput: "",
    confetti: makeConfetti(),
    isSendingPayment: false,
    profile: {
      phone: initialUser?.phone,
      username: initialUser?.username ?? "",
      fullName: initialUser?.displayName || initialUser?.username || "",
      isProfessional: false,
      verificationStatus: initialUser?.verificationStatus ?? "unverified",
    },
    wallets: initialUser?.wallets ?? [],
    sourceWalletId: initialUser?.sourceWalletId ?? "",
    activityLog: initialUser?.activityLog ?? [],
    notifications: initialUser?.notifications ?? [],
    invoices: initialUser?.invoices ?? [],
  };
}

type Patch = Partial<SquadState> | ((prev: SquadState) => Partial<SquadState> | null);

function reducer(state: SquadState, patch: Patch): SquadState {
  const partial = typeof patch === "function" ? patch(state) : patch;
  return partial ? { ...state, ...partial } : state;
}

export function useSquadApp(initialUser?: InitialSquadUser) {
  const [state, dispatch] = useReducer(reducer, initialState(initialUser));
  const timers = useRef(new Set<ReturnType<typeof setTimeout>>());
  const stateRef = useRef(state);

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

  const goHome = useCallback(() => dispatch({ screen: "home", linkOpen: false }), []);
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
  const goReceiveQr = useCallback(() => {
    if (!stateRef.current.wallets.length) {
      toast.error("Link an account first so SQUAD knows where to route incoming payments.");
      return;
    }

    dispatch({ screen: "receive-qr", qrToken: null, nearbyHandoff: null });
  }, []);
  const goScanQr = useCallback(() => {
    if (!stateRef.current.wallets.length) {
      toast.error("Link an account first so SQUAD can route your outgoing payment.");
      return;
    }

    dispatch({ screen: "scan-qr", scanManualInput: "", nearbyOptions: [], isLoadingNearbyOptions: false });
  }, []);

  const startQrRotation = useCallback(() => {
    let cancelled = false;
    let didShowQrError = false;
    let didShowNearbyError = false;

    const refresh = async () => {
      const [qrResult, nearbyResult] = await Promise.allSettled([
        fetch("/api/qr/mint", {
          method: "POST",
          cache: "no-store",
        }),
        fetch("/api/nearby/publish", {
          method: "POST",
          cache: "no-store",
        }),
      ]);

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
  }, []);

  const openLink = useCallback(
    () => dispatch({ linkOpen: true, linkStep: "provider", linkProviderId: null, linkIdentifierInput: "" }),
    [],
  );
  const closeLink = useCallback(() => dispatch({ linkOpen: false, linkConnectingId: null }), []);
  const selectLinkProvider = useCallback((providerId: string) => {
    const provider = PROVIDERS.find((entry) => entry.id === providerId);

    if (!provider) {
      return;
    }

    if (provider.acceptedRoutingTypes[0] === "rib" && stateRef.current.profile.verificationStatus !== "verified") {
      toast.error("Complete digital identity verification before linking a 20-digit RIB.");
      return;
    }

    dispatch({ linkProviderId: providerId, linkStep: "identifier", linkIdentifierInput: "" });
  }, []);
  const backToProviderPick = useCallback(() => dispatch({ linkStep: "provider", linkProviderId: null }), []);
  const onLinkIdentifierChange = useCallback((value: string) => dispatch({ linkIdentifierInput: value }), []);
  const confirmLinkWallet = useCallback(() => {
    const providerId = stateRef.current.linkProviderId;
    const provider = PROVIDERS.find((entry) => entry.id === providerId);

    if (!provider) {
      return;
    }

    dispatch({ linkConnectingId: provider.id });

    void (async () => {
      const result = await linkDestination({
        providerId: provider.id,
        routingValue: stateRef.current.linkIdentifierInput,
      });

      if (!result.ok) {
        dispatch({ linkConnectingId: null });
        toast.error(result.message);
        return;
      }

      dispatch((s) => ({
        wallets: [...s.wallets, result.wallet],
        sourceWalletId: result.sourceWalletId || s.sourceWalletId || result.wallet.id,
        linkConnectingId: null,
        linkOpen: false,
        linkIdentifierInput: "",
        linkProviderId: null,
        linkStep: "provider",
      }));

      toast.success(`${result.wallet.name} linked successfully.`);
    })();
  }, []);

  const selectSource = useCallback((id: string) => {
    const previousId = stateRef.current.sourceWalletId;
    dispatch((s) => ({
      sourceWalletId: id,
      wallets: applyDefaultWallet(s.wallets, id),
    }));

    void (async () => {
      const result = await setPrimaryDestination({ destinationId: id });
      if (!result.ok) {
        dispatch((s) => ({
          sourceWalletId: previousId,
          wallets: applyDefaultWallet(s.wallets, previousId),
        }));
        toast.error(result.message);
        return;
      }

      toast.success("Primary payment route updated.");
    })();
  }, []);

  const onRecipientChange = useCallback(
    (value: string) =>
      dispatch({
        recipientInput: value.replace(/^@+/, "").trim().toLowerCase(),
        recipientPreview: null,
      }),
    [],
  );
  const selectRecipient = useCallback(
    (preview: NonNullable<SquadState["recipientPreview"]>) =>
      dispatch({ recipientInput: preview.username, recipientPreview: preview }),
    [],
  );
  const keypadPress = useCallback((digit: string) => {
    dispatch((s) => {
      if (digit === "." && s.amount.includes(".")) return null;
      if (s.amount.length >= 6) return null;
      return { amount: s.amount + digit };
    });
  }, []);
  const keypadBackspace = useCallback(() => dispatch((s) => ({ amount: s.amount.slice(0, -1) })), []);
  const quickAmount5 = useCallback(() => dispatch({ amount: "5" }), []);

  const generateIntent = useCallback(() => {
    const amount = parseFloat(stateRef.current.amount);
    const recipient = stateRef.current.recipientInput.trim();

    if (!stateRef.current.wallets.length || !stateRef.current.sourceWalletId) {
      toast.error("Link and choose a destination account first.");
      return;
    }

    if (!amount || amount <= 0 || !recipient) {
      toast.error("Enter both a recipient and an amount.");
      return;
    }

    dispatch({ isSendingPayment: true });
    const loadingToast = toast.loading("Saving the payment route...");

    void (async () => {
      const result = await createPaymentIntent({
        sourceWalletId: stateRef.current.sourceWalletId,
        recipientUsername: recipient,
        amount,
      });

      toast.dismiss(loadingToast);

      if (!result.ok) {
        dispatch({ isSendingPayment: false });
        toast.error(result.message);
        return;
      }

      dispatch({
        isSendingPayment: false,
        currentIntent: result.intent,
        screen: "intent-result",
        confetti: makeConfetti(),
        amount: "",
        recipientInput: "",
        recipientPreview: null,
        activityLog: [result.activity, ...stateRef.current.activityLog],
        notifications: [result.senderNotification, ...stateRef.current.notifications],
        invoices: stateRef.current.profile.isProfessional
          ? [buildInvoice(result.intent, result.intent.recipient), ...stateRef.current.invoices]
          : stateRef.current.invoices,
      });

      toast.success("Payment intent saved and handed off to the bank rail.");
      attemptNativeHandoff(buildTunpayUri(result.intent));
    })();
  }, []);

  const doneIntent = useCallback(
    () => dispatch({ screen: "home", currentIntent: null, amount: "", recipientInput: "", recipientPreview: null }),
    [],
  );
  const shareReceipt = useCallback(() => toast.success("Receipt shared"), []);

  const onScanManualInputChange = useCallback((value: string) => dispatch({ scanManualInput: value }), []);
  const loadNearbyOptions = useCallback(() => {
    dispatch({ isLoadingNearbyOptions: true });

    void (async () => {
      try {
        const response = await fetch("/api/nearby/options", {
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
  }, []);
  const submitNearbyOption = useCallback((code: string) => {
    if (!/^\d{3}$/.test(code)) {
      toast.error("Choose a valid 3-digit nearby code.");
      return;
    }

    const loadingToast = toast.loading("Requesting that nearby code...");

    void (async () => {
      try {
        const response = await fetch("/api/nearby/claim", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ code }),
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
  }, []);

  const acceptPayerMatch = useCallback(() => {
    const code = stateRef.current.payerMatch?.code;
    if (!code) return;

    void (async () => {
      try {
        const response = await fetch("/api/nearby/accept", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code }),
        });

        const payload = (await response.json()) as {
          message?: string;
          match?: { status: "published" | "matched" | "confirmed"; ownerAccepted: boolean; payerAccepted: boolean; recipient?: NonNullable<SquadState["recipientPreview"]> };
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
  }, []);

  const acceptOwnerMatch = useCallback(() => {
    const code = stateRef.current.nearbyHandoff?.code;
    if (!code) return;

    void (async () => {
      try {
        const response = await fetch("/api/nearby/accept", {
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
  }, []);

  const startNearbyMatchPolling = useCallback((role: "owner" | "payer") => {
    let cancelled = false;

    const tick = async () => {
      const code = role === "owner" ? stateRef.current.nearbyHandoff?.code : stateRef.current.payerMatch?.code;
      if (!code) return;

      try {
        const response = await fetch(`/api/nearby/status?code=${encodeURIComponent(code)}`, { cache: "no-store" });
        if (!response.ok) return;

        const payload = (await response.json()) as {
          match?: { status: "published" | "matched" | "confirmed"; ownerAccepted: boolean; payerAccepted: boolean; recipient?: NonNullable<SquadState["recipientPreview"]> };
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
  }, []);
  const submitScannedToken = useCallback((raw: string) => {
    if (!stateRef.current.wallets.length) {
      toast.error("Link an account first so SQUAD can route the scanned payment.");
      return;
    }

    const loadingToast = toast.loading("Resolving the recipient...");

    void (async () => {
      try {
        const response = await fetch(`/api/qr/resolve?token=${encodeURIComponent(raw)}`, {
          method: "GET",
          cache: "no-store",
        });

        const payload = (await response.json()) as {
          message?: string;
          recipient?: NonNullable<SquadState["recipientPreview"]>;
        };

        toast.dismiss(loadingToast);

        if (!response.ok || !payload.recipient) {
          toast.error(payload.message ?? "That code isn't a valid SQUAD payment token.");
          return;
        }

        dispatch({
          recipientInput: payload.recipient.username,
          recipientPreview: payload.recipient,
          screen: "generate-intent",
          scanManualInput: "",
        });

        toast.success(`Recipient found: @${payload.recipient.username}`);
      } catch {
        toast.dismiss(loadingToast);
        toast.error("We couldn't resolve that QR code right now.");
      }
    })();
  }, []);
  const submitManualScanCode = useCallback(() => {
    submitScannedToken(stateRef.current.scanManualInput.trim());
  }, [submitScannedToken]);

  const readNotification = useCallback((notificationId: string) => {
    const notification = stateRef.current.notifications.find((item) => item.id === notificationId);
    if (!notification || !notification.unread) {
      return;
    }

    dispatch((s) => ({
      notifications: s.notifications.map((item) => (item.id === notificationId ? { ...item, unread: false } : item)),
    }));

    void (async () => {
      const result = await markNotificationRead({ notificationId });
      if (!result.ok) {
        dispatch((s) => ({
          notifications: s.notifications.map((item) => (item.id === notificationId ? { ...item, unread: true } : item)),
        }));
        toast.error(result.message);
      }
    })();
  }, []);

  const readAllNotifications = useCallback(() => {
    const previous = stateRef.current.notifications;
    if (!previous.some((item) => item.unread)) {
      return;
    }

    dispatch((s) => ({
      notifications: s.notifications.map((item) => ({ ...item, unread: false })),
    }));

    void (async () => {
      const result = await markAllNotificationsRead();
      if (!result.ok) {
        dispatch({ notifications: previous });
        toast.error(result.message);
        return;
      }

      toast.success("Notifications updated.");
    })();
  }, []);

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
      goActivity,
      goProfile,
      goNotifications,
      goInvoices,
      goGenerateIntent,
      goReceiveQr,
      goScanQr,
      startQrRotation,
      openLink,
      closeLink,
      selectLinkProvider,
      backToProviderPick,
      onLinkIdentifierChange,
      confirmLinkWallet,
      selectSource,
      onRecipientChange,
      selectRecipient,
      keypadPress,
      keypadBackspace,
      quickAmount5,
      generateIntent,
      doneIntent,
      shareReceipt,
      onScanManualInputChange,
      loadNearbyOptions,
      submitNearbyOption,
      acceptPayerMatch,
      acceptOwnerMatch,
      startNearbyMatchPolling,
      submitScannedToken,
      submitManualScanCode,
      readNotification,
      readAllNotifications,
    },
  };
}

export type UseSquadApp = ReturnType<typeof useSquadApp>;
