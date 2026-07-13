export type ActivityKind = "send" | "receive";

export interface ActivityItem {
  id: string;
  refId: string;
  type: ActivityKind;
  counterparty: string;
  counterpartyHandle: string;
  wallet: string;
  amount: number;
  date: string;
  status: "initiated" | "confirmed" | "failed";
}
