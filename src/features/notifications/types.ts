export type NotificationKind =
  | "payment_received"
  | "payment_sent"
  | "verification_approved"
  | "verification_pending"
  | "system";

export interface NotificationItem {
  id: string;
  type: NotificationKind;
  title: string;
  body: string;
  unread: boolean;
  createdAt: string;
}
