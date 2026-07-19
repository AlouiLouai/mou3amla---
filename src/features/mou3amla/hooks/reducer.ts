import type { InitialMou3amlaUser, Mou3amlaState } from "@/features/mou3amla/types";
import { getPreferredSendWalletId, makeConfetti } from "@/features/mou3amla/hooks/utils";

export type Patch = Partial<Mou3amlaState> | ((prev: Mou3amlaState) => Partial<Mou3amlaState> | null);

export function reducer(state: Mou3amlaState, patch: Patch): Mou3amlaState {
  const partial = typeof patch === "function" ? patch(state) : patch;
  return partial ? { ...state, ...partial } : state;
}

export function initialState(initialUser?: InitialMou3amlaUser): Mou3amlaState {
  return {
    screen: initialUser?.initialScreen ?? "home",
    initialHandoffMode: "qr",
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
      id: initialUser?.id ?? "",
      phone: initialUser?.phone,
      username: initialUser?.username ?? "",
      fullName: initialUser?.displayName || initialUser?.username || "",
      isProfessional: false,
      verificationStatus: initialUser?.verificationStatus ?? "unverified",
      kycProviderStatus: initialUser?.kycProviderStatus ?? null,
    },
    wallets: initialUser?.wallets ?? [],
    sourceWalletId: initialUser?.sourceWalletId ?? "",
    sendSourceWalletId: getPreferredSendWalletId(initialUser?.wallets ?? [], initialUser?.sourceWalletId ?? ""),
    activityLog: initialUser?.activityLog ?? [],
    notifications: initialUser?.notifications ?? [],
    invoices: initialUser?.invoices ?? [],
    highlightedActivityId: initialUser?.highlightedActivityId ?? null,
  };
}
