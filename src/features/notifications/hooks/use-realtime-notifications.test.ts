import { describe, expect, it } from "vitest";
import type { ActivityItem } from "@/features/activity/types";
import { parseRealtimeNotificationRow } from "@/features/notifications/hooks/use-realtime-notifications";

const activity: ActivityItem = {
  id: "tx-1",
  refId: "ref_1",
  type: "receive",
  counterparty: "Sender Person",
  counterpartyHandle: "@sender",
  wallet: "BIAT",
  amount: 20,
  date: "20 Jul",
  status: "confirmed",
};

describe("parseRealtimeNotificationRow", () => {
  it("reads activity metadata when Realtime delivers jsonb as an object", () => {
    const event = parseRealtimeNotificationRow({
      id: "notif-1",
      transaction_id: "tx-1",
      type: "payment_received",
      title: "Paiement recu",
      body: "Body",
      unread: true,
      created_at: "2026-07-20T12:00:00.000Z",
      metadata: { activity },
    });

    expect(event.transactionId).toBe("tx-1");
    expect(event.activity).toEqual(activity);
  });

  it("parses activity metadata when Realtime delivers jsonb as a string", () => {
    const event = parseRealtimeNotificationRow({
      id: "notif-2",
      transaction_id: "tx-1",
      type: "payment_received",
      title: "Paiement recu",
      body: "Body",
      unread: true,
      created_at: "2026-07-20T12:00:00.000Z",
      metadata: JSON.stringify({ activity }),
    });

    expect(event.transactionId).toBe("tx-1");
    expect(event.activity).toEqual(activity);
  });
});
