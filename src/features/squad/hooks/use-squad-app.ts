"use client";

import { useCallback, useEffect, useReducer, useRef } from "react";
import { toast } from "sonner";
import { AHMED_INITIAL_WALLETS, AHMED_PROFILE, ME_INITIAL_WALLETS, PROVIDERS } from "@/features/wallets/constants";
import type { LinkedWallet, RoutingType } from "@/features/wallets/types";
import { attemptNativeHandoff } from "@/features/payments/lib/deep-link";
import { buildTunpayUri, generateRefId } from "@/features/payments/lib/tunpay";
import { createQrToken, decodeQrToken, isQrTokenExpired } from "@/features/payments/lib/qr-token";
import { buildInvoice } from "@/features/invoices/lib/el-fatoora";
import type { ActivityItem } from "@/features/activity/types";
import type { AccountId, AccountState, SquadState } from "@/features/squad/types";

function makeConfetti() {
  const colors = ["#FFFFFF", "#C7C7CC", "#8E8E93"];
  return Array.from({ length: 24 }, (_, i) => ({
    left: `${(Math.random() * 92 + 2).toFixed(1)}%`,
    delay: `${(Math.random() * 1.2).toFixed(2)}s`,
    dur: `${(1.6 + Math.random() * 1.2).toFixed(2)}s`,
    color: colors[i % colors.length],
  }));
}

function otherAccountId(id: AccountId): AccountId {
  return id === "me" ? "ahmed" : "me";
}

/** Loose match: "@ahmed_k" or "ahmed_k" both resolve to the same username. */
function usernamesMatch(input: string, username: string): boolean {
  return input.replace(/^@/, "").trim().toLowerCase() === username.toLowerCase();
}

function initialState(): SquadState {
  return {
    screen: "auth",
    authMode: "signup",
    phoneInput: "",
    otpInput: "",
    onboarded: false,
    fullNameInput: "",
    matriculeFiscalInput: "",
    linkOpen: false,
    linkStep: "provider",
    linkProviderId: null,
    linkIdentifierInput: "",
    linkConnectingId: null,
    recipientInput: "",
    amount: "",
    currentIntent: null,
    qrToken: null,
    scanManualInput: "",
    confetti: makeConfetti(),
    activeAccountId: "me",
    accountSwitcherOpen: false,
    accounts: {
      me: {
        profile: { username: "", fullName: "", isProfessional: false },
        wallets: ME_INITIAL_WALLETS,
        sourceWalletId: ME_INITIAL_WALLETS[0].id,
        activityLog: [
          { id: "a2", type: "receive", counterparty: "Sami R.", wallet: "Ooredoo", amount: 60, date: "1 Jul" },
          { id: "a1", type: "send", counterparty: "Mariem B.", wallet: "Flouci", amount: 15, date: "28 Jun" },
        ],
        invoices: [],
      },
      ahmed: {
        profile: { ...AHMED_PROFILE },
        wallets: AHMED_INITIAL_WALLETS,
        sourceWalletId: AHMED_INITIAL_WALLETS[0].id,
        activityLog: [],
        invoices: [],
      },
    },
  };
}

type Patch = Partial<SquadState> | ((prev: SquadState) => Partial<SquadState> | null);

function reducer(state: SquadState, patch: Patch): SquadState {
  const partial = typeof patch === "function" ? patch(state) : patch;
  return partial ? { ...state, ...partial } : state;
}

/** Clean slug: lowercase, strip diacritics/spaces/symbols, alphanumeric + underscore. */
function slugifyUsername(fullName: string): string {
  return fullName
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 24);
}

function validateRoutingValue(type: RoutingType, value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return "This field is required.";
  if (type === "rib" && !/^\d{20}$/.test(trimmed)) {
    return "A RIB is exactly 20 digits.";
  }
  return null;
}

/** Patch one account slice, leaving the other and everything else untouched. */
function patchAccount(
  state: SquadState,
  id: AccountId,
  updater: Partial<AccountState> | ((prev: AccountState) => Partial<AccountState>),
): SquadState["accounts"] {
  const prev = state.accounts[id];
  const partial = typeof updater === "function" ? updater(prev) : updater;
  return { ...state.accounts, [id]: { ...prev, ...partial } };
}

export function useSquadApp() {
  const [state, dispatch] = useReducer(reducer, initialState());
  const timers = useRef(new Set<ReturnType<typeof setTimeout>>());
  const stateRef = useRef(state);

  // Ref writes must happen outside render (React Compiler lint rule), so the
  // "latest state for async callbacks" mirror is kept in sync via effect
  // rather than during the render body.
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

  const after = useCallback((ms: number, fn: () => void) => {
    const id = setTimeout(() => {
      timers.current.delete(id);
      fn();
    }, ms);
    timers.current.add(id);
    return id;
  }, []);

  // ---------- Auth ----------
  const setSignup = useCallback(() => dispatch({ authMode: "signup" }), []);
  const setSignin = useCallback(() => dispatch({ authMode: "signin" }), []);
  const onPhoneChange = useCallback((value: string) => dispatch({ phoneInput: value }), []);
  const onOtpChange = useCallback((value: string) => dispatch({ otpInput: value }), []);
  const continueAuth = useCallback(() => dispatch({ screen: "otp" }), []);
  // TODO(server-action): verify via Twilio Verify (or a local SMS provider).
  // Needs TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_VERIFY_SERVICE_SID —
  // see docs/06-conventions.md. Any 4-digit code is accepted for this prototype.
  const verifyOtp = useCallback(() => {
    dispatch((s) => ({ screen: s.onboarded ? "home" : "profile-setup" }));
  }, []);

  // ---------- Profile setup ("me" only — Ahmed is pre-onboarded) ----------
  const onFullNameChange = useCallback((value: string) => dispatch({ fullNameInput: value }), []);
  const onMatriculeFiscalChange = useCallback((value: string) => dispatch({ matriculeFiscalInput: value }), []);
  const toggleProfessional = useCallback(
    () =>
      dispatch((s) => ({
        accounts: patchAccount(s, "me", (a) => ({ profile: { ...a.profile, isProfessional: !a.profile.isProfessional } })),
      })),
    [],
  );
  const submitProfile = useCallback(() => {
    const fullName = stateRef.current.fullNameInput.trim();
    if (!fullName) return;
    const username = slugifyUsername(fullName) || "squad_user";
    const isProfessional = stateRef.current.accounts.me.profile.isProfessional;
    const matriculeFiscal = isProfessional ? stateRef.current.matriculeFiscalInput.trim() : undefined;
    dispatch((s) => ({
      accounts: patchAccount(s, "me", { profile: { username, fullName, isProfessional, matriculeFiscal } }),
      onboarded: true,
      screen: "home",
    }));
  }, []);

  // ---------- Account switcher (demo-only — see types.ts AccountId) ----------
  const openAccountSwitcher = useCallback(() => dispatch({ accountSwitcherOpen: true }), []);
  const closeAccountSwitcher = useCallback(() => dispatch({ accountSwitcherOpen: false }), []);
  const switchAccount = useCallback(
    (id: AccountId) =>
      dispatch({
        activeAccountId: id,
        accountSwitcherOpen: false,
        linkOpen: false,
        screen: "home",
      }),
    [],
  );

  // ---------- Nav ----------
  const goHome = useCallback(() => dispatch({ screen: "home", linkOpen: false }), []);
  const goActivity = useCallback(() => dispatch({ screen: "activity" }), []);
  const goProfile = useCallback(() => dispatch({ screen: "profile" }), []);
  const goInvoices = useCallback(() => dispatch({ screen: "invoices" }), []);
  const goGenerateIntent = useCallback(
    () => dispatch({ screen: "generate-intent", amount: "", recipientInput: "" }),
    [],
  );
  const goReceiveQr = useCallback(() => {
    dispatch((s) => ({ screen: "receive-qr", qrToken: createQrToken(s.accounts[s.activeAccountId].profile.username) }));
  }, []);
  const goScanQr = useCallback(() => dispatch({ screen: "scan-qr", scanManualInput: "" }), []);

  // ---------- QR rotation (receive screen) ----------
  const startQrRotation = useCallback(() => {
    const interval = setInterval(() => {
      dispatch((s) => ({ qrToken: createQrToken(s.accounts[s.activeAccountId].profile.username) }));
    }, 60_000);
    timers.current.add(interval);
    return () => {
      clearInterval(interval);
      timers.current.delete(interval);
    };
  }, []);

  // ---------- Wallet registry ----------
  const openLink = useCallback(() => dispatch({ linkOpen: true, linkStep: "provider", linkProviderId: null, linkIdentifierInput: "" }), []);
  const closeLink = useCallback(() => dispatch({ linkOpen: false, linkConnectingId: null }), []);
  const selectLinkProvider = useCallback(
    (providerId: string) => dispatch({ linkProviderId: providerId, linkStep: "identifier", linkIdentifierInput: "" }),
    [],
  );
  const backToProviderPick = useCallback(() => dispatch({ linkStep: "provider", linkProviderId: null }), []);
  const onLinkIdentifierChange = useCallback((value: string) => dispatch({ linkIdentifierInput: value }), []);
  const confirmLinkWallet = useCallback(() => {
    const providerId = stateRef.current.linkProviderId;
    const provider = PROVIDERS.find((p) => p.id === providerId);
    if (!provider) return;
    const routingType = provider.acceptedRoutingTypes[0];
    const error = validateRoutingValue(routingType, stateRef.current.linkIdentifierInput);
    if (error) {
      toast.error(error);
      return;
    }
    dispatch({ linkConnectingId: provider.id });
    after(900, () => {
      const wallet: LinkedWallet = {
        id: `${provider.id}_${Date.now()}`,
        providerId: provider.id,
        name: provider.name,
        network: provider.network.split(" ")[0],
        color: provider.color,
        initials: provider.initials,
        routingType,
        routingValue: stateRef.current.linkIdentifierInput.trim(),
      };
      dispatch((s) => ({
        accounts: patchAccount(s, s.activeAccountId, (a) => ({ wallets: [...a.wallets, wallet] })),
        linkConnectingId: null,
      }));
      after(400, () => dispatch({ linkOpen: false }));
    });
  }, [after]);

  // ---------- Generate payment intent ----------
  const selectSource = useCallback(
    (id: string) => dispatch((s) => ({ accounts: patchAccount(s, s.activeAccountId, { sourceWalletId: id }) })),
    [],
  );
  const onRecipientChange = useCallback((value: string) => dispatch({ recipientInput: value }), []);
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
    if (!amount || amount <= 0 || !recipient) return;

    const senderId = stateRef.current.activeAccountId;
    const sender = stateRef.current.accounts[senderId];

    const intent = {
      id: crypto.randomUUID(),
      refId: generateRefId(),
      amount,
      recipient,
      sourceWalletId: sender.sourceWalletId,
      createdAt: Date.now(),
      status: "building" as const,
    };
    dispatch({ currentIntent: intent, screen: "intent-result" });

    attemptNativeHandoff(buildTunpayUri(intent));
    dispatch((s) => (s.currentIntent ? { currentIntent: { ...s.currentIntent, status: "dispatched" } } : null));

    // Simulates the mou3amla://payment-success?ref=... callback a real
    // banking app would trigger after completing the transfer on its own
    // rails — SQUAD itself never confirms fund movement.
    after(2200, () => {
      dispatch((s) => {
        if (!s.currentIntent) return null;
        const confirmed = { ...s.currentIntent, status: "confirmed" as const };
        const senderAccount = s.accounts[senderId];
        const sourceWallet = senderAccount.wallets.find((w) => w.id === confirmed.sourceWalletId);

        const senderEntry: ActivityItem = {
          id: confirmed.id,
          type: "send",
          counterparty: confirmed.recipient,
          wallet: sourceWallet?.name ?? "Wallet",
          amount: confirmed.amount,
          date: "Today",
        };

        let accounts = patchAccount(s, senderId, (a) => ({
          activityLog: [senderEntry, ...a.activityLog],
          invoices: a.profile.isProfessional ? [buildInvoice(confirmed, confirmed.recipient), ...a.invoices] : a.invoices,
        }));

        // If the recipient resolves to the other demo persona, land a
        // matching "receive" entry (and, if they're a pro account, an
        // income invoice) on their side too — this is what makes the
        // account switcher a genuine two-sided demo instead of a one-way
        // simulation.
        const recipientId = otherAccountId(senderId);
        const recipientAccount = accounts[recipientId];
        if (usernamesMatch(confirmed.recipient, recipientAccount.profile.username)) {
          const recipientEntry: ActivityItem = {
            id: `${confirmed.id}-recv`,
            type: "receive",
            counterparty: senderAccount.profile.username || "SQUAD user",
            wallet: recipientAccount.wallets[0]?.name ?? "Wallet",
            amount: confirmed.amount,
            date: "Today",
          };
          accounts = {
            ...accounts,
            [recipientId]: {
              ...recipientAccount,
              activityLog: [recipientEntry, ...recipientAccount.activityLog],
              invoices: recipientAccount.profile.isProfessional
                ? [buildInvoice(confirmed, senderAccount.profile.username || "SQUAD user"), ...recipientAccount.invoices]
                : recipientAccount.invoices,
            },
          };
        }

        return { currentIntent: confirmed, accounts, confetti: makeConfetti() };
      });
    });
  }, [after]);

  const doneIntent = useCallback(
    () => dispatch({ screen: "home", currentIntent: null, amount: "", recipientInput: "" }),
    [],
  );
  const shareReceipt = useCallback(() => toast.success("Receipt shared"), []);

  // ---------- Scan QR ----------
  const onScanManualInputChange = useCallback((value: string) => dispatch({ scanManualInput: value }), []);
  const submitScannedToken = useCallback((raw: string) => {
    const token = decodeQrToken(raw);
    if (!token) {
      toast.error("That code isn't a valid SQUAD payment token.");
      return;
    }
    if (isQrTokenExpired(token)) {
      toast.error("This code expired. Ask the recipient to refresh their QR.");
      return;
    }
    dispatch({ recipientInput: token.recipient, screen: "generate-intent" });
  }, []);
  const submitManualScanCode = useCallback(() => {
    submitScannedToken(stateRef.current.scanManualInput.trim());
  }, [submitScannedToken]);

  const logout = useCallback(() => dispatch(initialState()), []);

  const account = state.accounts[state.activeAccountId];

  return {
    state,
    derived: {
      account,
      otherAccount: state.accounts[otherAccountId(state.activeAccountId)],
      sourceWallet: account.wallets.find((w) => w.id === account.sourceWalletId) ?? account.wallets[0],
      availableProviders: PROVIDERS.filter((p) => !account.wallets.some((w) => w.providerId === p.id)),
      linkProvider: PROVIDERS.find((p) => p.id === state.linkProviderId) ?? null,
    },
    actions: {
      setSignup,
      setSignin,
      onPhoneChange,
      onOtpChange,
      continueAuth,
      verifyOtp,
      onFullNameChange,
      onMatriculeFiscalChange,
      toggleProfessional,
      submitProfile,
      openAccountSwitcher,
      closeAccountSwitcher,
      switchAccount,
      goHome,
      goActivity,
      goProfile,
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
      keypadPress,
      keypadBackspace,
      quickAmount5,
      generateIntent,
      doneIntent,
      shareReceipt,
      onScanManualInputChange,
      submitScannedToken,
      submitManualScanCode,
      logout,
    },
  };
}

export type UseSquadApp = ReturnType<typeof useSquadApp>;
