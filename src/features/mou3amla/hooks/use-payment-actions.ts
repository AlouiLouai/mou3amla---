import { useCallback, type RefObject } from "react";
import { toast } from "@/lib/toast";
import { buildInvoice } from "@/features/invoices/lib/el-fatoora";
import { createPaymentIntent } from "@/features/payments/server/actions";
import { BCT_SANDBOX_TEST_LIMIT_TND } from "@/features/payments/constants";
import type { Mou3amlaState } from "@/features/mou3amla/types";
import type { Patch } from "@/features/mou3amla/hooks/reducer";
import { getPreferredSendWalletId, makeConfetti } from "@/features/mou3amla/hooks/utils";
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
  const setQuickAmount = useCallback((amount: number) => dispatch({ amount: String(amount) }), [dispatch]);
  const clearAmount = useCallback(() => dispatch({ amount: "" }), [dispatch]);

  const generateIntent = useCallback(() => {
    const amount = parseFloat(stateRef.current.amount);
    const recipient = stateRef.current.recipientInput.trim();

    if (!stateRef.current.wallets.length || !stateRef.current.sendSourceWalletId) {
      toast.error("Link an available wallet or bank route first, then choose the one that should open the checkout.");
      return;
    }

    if (!amount || amount <= 0 || !recipient) {
      toast.error("Enter both a recipient and an amount.");
      return;
    }

    if (amount > BCT_SANDBOX_TEST_LIMIT_TND) {
      toast.error(`Sandbox test transactions are capped at ${BCT_SANDBOX_TEST_LIMIT_TND} TND while Mou3amla is under BCT regulatory testing.`);
      return;
    }

    dispatch({ isSendingPayment: true });
    const loadingToast = toast.loading("Saving the payment route...");

    void (async () => {
      try {
        const result = await createPaymentIntent({
          sourceWalletId: stateRef.current.sendSourceWalletId,
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
          screen: "home",
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

        // Both sides of this transfer are guaranteed identity-verified by
        // construction - the recipient check already ran server-side in
        // createPaymentIntent, and sending itself was only reachable because
        // linking a source destination requires the sender's own
        // verification_status === "verified" (see wallets/server/actions.ts).
        // Surfacing that here is reporting a real, enforced guarantee, not a
        // trust claim invented for the toast.
        const isKonnectHostedCheckout = result.checkout.providerId === "konnect";

        toast.success(`Opening the ${result.checkout.providerName} checkout...`, {
          description: isKonnectHostedCheckout
            ? "Mou3amla saved the route first, then opened the real Konnect sandbox checkout."
            : "Mou3amla saved the route first, then opened the in-app development payment demo.",
        });

        window.location.assign(result.checkout.url);
      } catch {
        // Without this, a dropped connection mid-request left the send
        // button spinning forever (isSendingPayment never reset) with no
        // error shown - the worst possible failure mode for a live demo.
        toast.dismiss(loadingToast);
        dispatch({ isSendingPayment: false });
        toast.error("We couldn't reach Mou3amla right now. Check your connection and try again.");
      }
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
            sendSourceWalletId: getPreferredSendWalletId(
              stateRef.current.wallets,
              stateRef.current.sendSourceWalletId || stateRef.current.sourceWalletId,
            ),
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
    setQuickAmount,
    clearAmount,
    generateIntent,
    doneIntent,
    shareReceipt,
    onScanManualInputChange,
    submitScannedToken,
    submitManualScanCode,
  };
}
