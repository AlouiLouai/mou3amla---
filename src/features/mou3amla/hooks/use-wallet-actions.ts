import { useCallback, type RefObject } from "react";
import type { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { Mou3amlaState } from "@/features/mou3amla/types";
import type { Patch } from "@/features/mou3amla/hooks/reducer";
import { applyDefaultWallet } from "@/features/mou3amla/hooks/utils";
import { PROVIDERS } from "@/features/wallets/constants";
import { linkDestination, setPrimaryDestination } from "@/features/wallets/server/actions";

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
      const provider = PROVIDERS.find((entry) => entry.id === providerId);

      if (!provider) {
        return;
      }

      if (stateRef.current.profile.verificationStatus !== "verified") {
        toast.error("Complete digital identity verification before linking a wallet or bank account.");
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
  }, [dispatch, stateRef]);

  const selectSource = useCallback(
    (id: string) => {
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
      })();
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
  };
}
