import { useCallback, type RefObject } from "react";
import { toast } from "sonner";
import { buildInvoice } from "@/features/invoices/lib/el-fatoora";
import { attemptNativeHandoff } from "@/features/payments/lib/deep-link";
import { buildTunpayUri } from "@/features/payments/lib/tunpay";
import { createPaymentIntent } from "@/features/payments/server/actions";
import type { Mou3amlaState } from "@/features/mou3amla/types";
import type { Patch } from "@/features/mou3amla/hooks/reducer";
import { makeConfetti } from "@/features/mou3amla/hooks/utils";
import { fetchWithTimeout } from "@/lib/fetch-with-timeout";

export function usePaymentActions({
  dispatch,
  stateRef,
}: {
  dispatch: (patch: Patch) => void;
  stateRef: RefObject<Mou3amlaState>;
}) {
  const onRecipientChange = useCallback(
    (value: string) =>
      dispatch({
        recipientInput: value.replace(/^@+/, "").trim().toLowerCase(),
        recipientPreview: null,
      }),
    [dispatch],
  );

  const selectRecipient = useCallback(
    (preview: NonNullable<Mou3amlaState["recipientPreview"]>) => dispatch({ recipientInput: preview.username, recipientPreview: preview }),
    [dispatch],
  );

  const keypadPress = useCallback(
    (digit: string) => {
      dispatch((s) => {
        if (digit === "." && s.amount.includes(".")) return null;
        if (s.amount.length >= 6) return null;
        return { amount: s.amount + digit };
      });
    },
    [dispatch],
  );

  const keypadBackspace = useCallback(() => dispatch((s) => ({ amount: s.amount.slice(0, -1) })), [dispatch]);
  const quickAmount5 = useCallback(() => dispatch({ amount: "5" }), [dispatch]);
  const clearAmount = useCallback(() => dispatch({ amount: "" }), [dispatch]);

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
  }, [dispatch, stateRef]);

  const doneIntent = useCallback(
    () => dispatch({ screen: "home", currentIntent: null, amount: "", recipientInput: "", recipientPreview: null }),
    [dispatch],
  );
  const shareReceipt = useCallback(() => toast.success("Receipt shared"), []);

  const onScanManualInputChange = useCallback((value: string) => dispatch({ scanManualInput: value }), [dispatch]);

  const submitScannedToken = useCallback(
    (raw: string) => {
      if (!stateRef.current.wallets.length) {
        toast.error("Link an account first so Mou3amla can route the scanned payment.");
        return;
      }

      const loadingToast = toast.loading("Resolving the recipient...");

      void (async () => {
        try {
          const response = await fetchWithTimeout(`/api/qr/resolve?token=${encodeURIComponent(raw)}`, {
            method: "GET",
            cache: "no-store",
          });

          const payload = (await response.json()) as {
            message?: string;
            recipient?: NonNullable<Mou3amlaState["recipientPreview"]>;
          };

          toast.dismiss(loadingToast);

          if (!response.ok || !payload.recipient) {
            toast.error(payload.message ?? "That code isn't a valid Mou3amla payment token.");
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
    },
    [dispatch, stateRef],
  );

  const submitManualScanCode = useCallback(() => {
    submitScannedToken(stateRef.current.scanManualInput.trim());
  }, [stateRef, submitScannedToken]);

  return {
    onRecipientChange,
    selectRecipient,
    keypadPress,
    keypadBackspace,
    quickAmount5,
    clearAmount,
    generateIntent,
    doneIntent,
    shareReceipt,
    onScanManualInputChange,
    submitScannedToken,
    submitManualScanCode,
  };
}
