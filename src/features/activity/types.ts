export type ActivityKind = "send" | "receive";

export interface ActivityItem {
  id: string;
  type: ActivityKind;
  counterparty: string;
  wallet: string;
  amount: number;
  date: string;
}
