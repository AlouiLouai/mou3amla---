import { useCallback, type RefObject } from "react";
import type { useRouter } from "next/navigation";
import { toast } from "@/lib/toast";
import type { Mou3amlaState } from "@/features/mou3amla/types";
import type { Patch } from "@/features/mou3amla/hooks/reducer";
import { applyDefaultWallet, getPreferredSendWalletId } from "@/features/mou3amla/hooks/utils";
import { getProviderById, isProviderServiceDown, PROVIDERS } from "@/features/wallets/constants";
import { deleteDestination, linkDestination, setPrimaryDestination } from "@/features/wallets/server/actions";

export function useWalletActions({
  dispatch,
  stateRef,
  router,
}: {
  dispatch: (patch: Patch) => void;
  stateRef: RefObject<Mou3amlaState>;
  router: ReturnType<typeof useRouter>;
}) {
  const openLink = useCallback(() => {
    if (stateRef.current.profile.verificationStatus !== "verified") {
      toast.error("Complete digital identity verification before linking a wallet or bank account.");
      router.push("/verify-identity");
      return;
    }

    dispatch({ linkOpen: true, linkStep: "provider", linkProviderId: null, linkIdentifierInput: "" });
  }, [dispatch, router, stateRef]);

  const closeLink = useCallback(() => dispatch({ linkOpen: false, linkConnectingId: null }), [dispatch]);

  const selectLinkProvider = useCallback(
    (providerId: string) => {
      const provider = getProviderById(providerId);

      if (!provider) {
        return;
      }

      if (stateRef.current.profile.verificationStatus !== "verified") {
        toast.error("Complete digital identity verification before linking a wallet or bank account.");
        return;
      }

      if (isProviderServiceDown(provider.id)) {
        toast.error(`${provider.name} is temporarily unavailable right now. Choose another route for the demo.`);
        return;
      }

      dispatch({ linkProviderId: providerId, linkStep: "identifier", linkIdentifierInput: "" });
    },
    [dispatch, stateRef],
  );

  const backToProviderPick = useCallback(() => dispatch({ linkStep: "provider", linkProviderId: null }), [dispatch]);
  const onLinkIdentifierChange = useCallback((value: string) => dispatch({ linkIdentifierInput: value }), [dispatch]);

  const confirmLinkWallet = useCallback(() => {
    const providerId = stateRef.current.linkProviderId;
    const provider = PROVIDERS.find((entry) => entry.id === providerId);

    if (!provider) {
      return;
    }

    dispatch({ linkConnectingId: provider.id });

    void (async () => {
      try {
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
          sendSourceWalletId: getPreferredSendWalletId(
            [...s.wallets, result.wallet],
            s.sendSourceWalletId || result.sourceWalletId || s.sourceWalletId || result.wallet.id,
          ),
          linkConnectingId: null,
          linkOpen: false,
          linkIdentifierInput: "",
          linkProviderId: null,
          linkStep: "provider",
        }));

        toast.success(`${result.wallet.name} linked successfully.`);
      } catch {
        // Without this, a dropped connection left the "Link Account" button
        // spinning forever (linkConnectingId never reset) with no error shown.
        dispatch({ linkConnectingId: null });
        toast.error("We couldn't reach Mou3amla right now. Check your connection and try again.");
      }
    })();
  }, [dispatch, stateRef]);

  const selectSource = useCallback(
    (id: string) => {
      const previousId = stateRef.current.sourceWalletId;
      dispatch((s) => ({
        sourceWalletId: id,
        wallets: applyDefaultWallet(s.wallets, id),
      }));

      void (async () => {
        try {
          const result = await setPrimaryDestination({ destinationId: id });
          if (!result.ok) {
            dispatch((s) => ({
              sourceWalletId: previousId,
              wallets: applyDefaultWallet(s.wallets, previousId),
            }));
            toast.error(result.message);
          }
        } catch {
          dispatch((s) => ({
            sourceWalletId: previousId,
            wallets: applyDefaultWallet(s.wallets, previousId),
          }));
          toast.error("We couldn't reach Mou3amla right now. Please try again.");
        }
      })();
    },
    [dispatch, stateRef],
  );

  const selectSendSource = useCallback(
    (id: string) => {
      dispatch({ sendSourceWalletId: id });
    },
    [dispatch],
  );

  const deleteLinkedDestination = useCallback(
    async (id: string) => {
      const wallet = stateRef.current.wallets.find((entry) => entry.id === id);
      if (!wallet) {
        return { ok: false, message: "That destination no longer exists." };
      }

      try {
        const result = await deleteDestination({ destinationId: id });
        if (!result.ok) {
          toast.error(result.message);
          return result;
        }

        dispatch((s) => {
          const wallets = s.wallets.filter((entry) => entry.id !== id);
          const sourceWalletId = result.nextSourceWalletId || (s.sourceWalletId === id ? "" : s.sourceWalletId);

          return {
            wallets: applyDefaultWallet(wallets, sourceWalletId),
            sourceWalletId,
            sendSourceWalletId: getPreferredSendWalletId(wallets, s.sendSourceWalletId === id ? sourceWalletId : s.sendSourceWalletId),
          };
        });

        toast.success(`${wallet.name} removed from linked accounts.`);
        return result;
      } catch {
        // Without this, a dropped connection surfaced as an unhandled
        // promise rejection with no user-facing feedback - the caller's
        // .finally() still resets its own local "deleting" state either way,
        // but the user deserves to know the delete didn't actually happen.
        const message = "We couldn't reach Mou3amla right now. Please try again.";
        toast.error(message);
        return { ok: false, message };
      }
    },
    [dispatch, stateRef],
  );

  return {
    openLink,
    closeLink,
    selectLinkProvider,
    backToProviderPick,
    onLinkIdentifierChange,
    confirmLinkWallet,
    selectSource,
    selectSendSource,
    deleteLinkedDestination,
  };
}
