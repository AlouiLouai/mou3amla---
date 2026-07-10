"use client";

import { useCallback, useEffect, useReducer, useRef } from "react";
import { toast } from "sonner";
import { INITIAL_WALLETS, PROVIDERS, formatDT } from "@/features/squad/constants";
import type { SquadState, TransferRole } from "@/features/squad/types";

function makeConfetti() {
  const colors = ["#00FFA0", "#B478FF", "#F4F5F6"];
  return Array.from({ length: 24 }, (_, i) => ({
    left: `${(Math.random() * 92 + 2).toFixed(1)}%`,
    delay: `${(Math.random() * 1.2).toFixed(2)}s`,
    dur: `${(1.6 + Math.random() * 1.2).toFixed(2)}s`,
    color: colors[i % colors.length],
  }));
}

const initialState: SquadState = {
  screen: "auth",
  authMode: "signup",
  phoneInput: "",
  otpInput: "",
  verified: false,
  kycStep: "intro",
  kycSessionId: "D7X29K",
  linkOpen: false,
  linkConnectingId: null,
  wallets: INITIAL_WALLETS,
  transferRole: "send",
  transferStep: "input",
  sourceWalletId: "flouci",
  amount: "",
  handshakeIndex: 0,
  txId: "",
  activityLog: [
    { id: "a2", type: "receive", counterparty: "Sami R.", wallet: "Ooredoo", amount: 60, date: "1 Jul" },
    { id: "a1", type: "send", counterparty: "Mariem B.", wallet: "Flouci", amount: 15, date: "28 Jun" },
  ],
  confetti: makeConfetti(),
};

type Patch = Partial<SquadState> | ((prev: SquadState) => Partial<SquadState> | null);

function reducer(state: SquadState, patch: Patch): SquadState {
  const partial = typeof patch === "function" ? patch(state) : patch;
  return partial ? { ...state, ...partial } : state;
}

const HANDSHAKE_LABELS: Record<TransferRole, string[]> = {
  send: [
    "Nearby device detected",
    "Frequency lock — 18.5 kHz",
    "Token exchange verified",
    "Wallet route matched via TUNPAY",
  ],
  receive: [
    "Sender device detected",
    "Frequency lock — 18.5 kHz",
    "Token received & verified",
    "Wallet route matched via TUNPAY",
  ],
};

export function useSquadApp() {
  const [state, dispatch] = useReducer(reducer, initialState);
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
  const verifyOtp = useCallback(() => dispatch({ screen: "home" }), []);

  // ---------- Nav ----------
  const goHome = useCallback(() => dispatch({ screen: "home", linkOpen: false }), []);
  const goActivity = useCallback(() => dispatch({ screen: "activity" }), []);
  const goProfile = useCallback(() => dispatch({ screen: "profile" }), []);
  const goSend = useCallback(() => {
    dispatch((s) => ({
      screen: s.verified ? "transfer" : "kyc",
      kycStep: "intro",
      transferStep: "input",
      transferRole: "send",
      amount: "",
    }));
  }, []);

  // ---------- KYC ----------
  const startKyc = useCallback(() => dispatch({ screen: "kyc", kycStep: "intro" }), []);
  const kycBack = useCallback(() => dispatch({ screen: "home" }), []);
  const kycStart = useCallback(() => {
    dispatch({ kycStep: "front" });
    after(1800, () => {
      dispatch({ kycStep: "back" });
      after(1800, () => {
        dispatch({ kycStep: "liveness" });
        after(2200, () => {
          dispatch({ kycStep: "processing" });
          after(1600, () => dispatch({ kycStep: "success", verified: true }));
        });
      });
    });
  }, [after]);
  const finishKyc = useCallback(() => dispatch({ screen: "home" }), []);

  // ---------- Link account ----------
  const openLink = useCallback(() => dispatch({ linkOpen: true }), []);
  const closeLink = useCallback(() => dispatch({ linkOpen: false, linkConnectingId: null }), []);
  const connectProvider = useCallback(
    (id: string) => {
      dispatch({ linkConnectingId: id });
      after(1200, () => {
        const provider = PROVIDERS.find((p) => p.id === id);
        if (!provider) return;
        dispatch((s) => ({
          wallets: [
            ...s.wallets,
            {
              id: provider.id,
              name: provider.name,
              tag: provider.network,
              balance: provider.mockBalance,
              network: provider.network.split(" ")[0],
              color: provider.color,
              initials: provider.initials,
            },
          ],
          linkConnectingId: null,
        }));
        after(500, () => dispatch({ linkOpen: false }));
      });
    },
    [after],
  );

  // ---------- Transfer ----------
  const setRoleSend = useCallback(() => dispatch({ transferRole: "send", transferStep: "input", amount: "" }), []);
  const setRoleReceive = useCallback(() => dispatch({ transferRole: "receive", transferStep: "input" }), []);
  const selectSource = useCallback((id: string) => dispatch({ sourceWalletId: id }), []);
  const keypadPress = useCallback((digit: string) => {
    dispatch((s) => {
      if (digit === "." && s.amount.includes(".")) return null;
      if (s.amount.length >= 6) return null;
      return { amount: s.amount + digit };
    });
  }, []);
  const keypadBackspace = useCallback(() => dispatch((s) => ({ amount: s.amount.slice(0, -1) })), []);
  const quickAmount5 = useCallback(() => dispatch({ amount: "5" }), []);

  const finalizeTransfer = useCallback(() => {
    const amt = parseFloat(stateRef.current.amount) || 42.5;
    const txId = `TX-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    const role = stateRef.current.transferRole;
    dispatch((s) => ({
      txId,
      activityLog: [
        { id: txId, type: role, counterparty: "Ahmed K.", wallet: role === "send" ? "Ooredoo" : "Flouci", amount: amt, date: "Today" },
        ...s.activityLog,
      ],
    }));
  }, []);

  const runHandshake = useCallback(() => {
    dispatch({ transferStep: "handshake", handshakeIndex: 0 });
    const interval = setInterval(() => {
      dispatch((s) => {
        const next = s.handshakeIndex + 1;
        if (next >= 4) {
          clearInterval(interval);
          timers.current.delete(interval);
          after(500, () => {
            if (stateRef.current.transferRole === "send") {
              dispatch({ transferStep: "biometric" });
            } else {
              finalizeTransfer();
              dispatch({ transferStep: "success", confetti: makeConfetti() });
            }
          });
        }
        return { handshakeIndex: next };
      });
    }, 650);
    timers.current.add(interval);
  }, [after, finalizeTransfer]);

  const initiateBeam = useCallback(() => {
    const value = parseFloat(stateRef.current.amount);
    if (!value || value <= 0) return;
    dispatch({ transferStep: "transmit" });
    after(2000, runHandshake);
  }, [after, runHandshake]);

  const startListening = useCallback(() => {
    dispatch({ transferStep: "transmit" });
    after(2000, runHandshake);
  }, [after, runHandshake]);

  const cancelTransmit = useCallback(() => dispatch({ transferStep: "input" }), []);

  const authenticateBio = useCallback(() => {
    after(700, () => {
      finalizeTransfer();
      dispatch({ transferStep: "success", confetti: makeConfetti() });
    });
  }, [after, finalizeTransfer]);

  const doneTransfer = useCallback(
    () => dispatch({ screen: "home", transferStep: "input", transferRole: "send", amount: "" }),
    [],
  );
  const shareReceipt = useCallback(() => toast.success("Receipt shared"), []);

  const logout = useCallback(
    () =>
      dispatch({
        screen: "auth",
        authMode: "signup",
        phoneInput: "",
        otpInput: "",
        verified: false,
        kycStep: "intro",
        linkOpen: false,
        transferStep: "input",
        transferRole: "send",
        amount: "",
      }),
    [],
  );

  const totalBalance = state.wallets.reduce((sum, w) => sum + w.balance, 0);
  const handshakeLabels = HANDSHAKE_LABELS[state.transferRole];

  return {
    state,
    derived: {
      totalBalanceStr: formatDT(totalBalance),
      handshakeLabels,
      sourceWallet: state.wallets.find((w) => w.id === state.sourceWalletId) ?? state.wallets[0],
      availableProviders: PROVIDERS.filter((p) => !state.wallets.some((w) => w.id === p.id)),
    },
    actions: {
      setSignup,
      setSignin,
      onPhoneChange,
      onOtpChange,
      continueAuth,
      verifyOtp,
      goHome,
      goActivity,
      goProfile,
      goSend,
      startKyc,
      kycBack,
      kycStart,
      finishKyc,
      openLink,
      closeLink,
      connectProvider,
      setRoleSend,
      setRoleReceive,
      selectSource,
      keypadPress,
      keypadBackspace,
      quickAmount5,
      initiateBeam,
      startListening,
      cancelTransmit,
      authenticateBio,
      doneTransfer,
      shareReceipt,
      logout,
    },
  };
}

export type UseSquadApp = ReturnType<typeof useSquadApp>;
