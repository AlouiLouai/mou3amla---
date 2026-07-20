"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type { NotificationItem } from "@/features/notifications/types";
import type { ActivityItem } from "@/features/activity/types";

type NotificationRow = {
  id: string;
  transaction_id?: string | null;
  type: NotificationItem["type"];
  title: string;
  body: string;
  unread: boolean;
  created_at: string;
  metadata: { activity?: ActivityItem } | string | null;
};

export type RealtimeNotificationEvent = {
  notification: NotificationItem;
  transactionId?: string;
  /** Present on `payment_received` - the recipient's own Activity row for
   * this transaction, embedded at write time so the client can show it
   * immediately instead of waiting for a separate fetch. */
  activity?: ActivityItem;
};

const NOTIFICATION_FALLBACK_POLL_MS = 4_000;

function parseNotificationMetadata(metadata: NotificationRow["metadata"]): { activity?: ActivityItem } | null {
  if (!metadata) {
    return null;
  }

  if (typeof metadata === "string") {
    try {
      const parsed = JSON.parse(metadata) as unknown;
      return parsed && typeof parsed === "object" ? (parsed as { activity?: ActivityItem }) : null;
    } catch {
      return null;
    }
  }

  return metadata;
}

export function parseRealtimeNotificationRow(row: NotificationRow): RealtimeNotificationEvent {
  const metadata = parseNotificationMetadata(row.metadata);
  return {
    notification: {
      id: row.id,
      type: row.type,
      title: row.title,
      body: row.body,
      unread: row.unread,
      createdAt: row.created_at,
    },
    transactionId: row.transaction_id ?? undefined,
    activity: metadata?.activity,
  };
}

function mergeSeenNotificationIds(target: Set<string>, notificationIds: readonly string[]) {
  for (const notificationId of notificationIds) {
    target.add(notificationId);
  }
}

/** Delivers new rows in `public.notifications` the moment they're inserted -
 * e.g. a "payment received" notification lands live, not on the next page
 * load. Scoped to the current user's own rows via a Postgres Changes filter,
 * which Supabase Realtime enforces against the same `notifications_select_own`
 * RLS policy the REST API already uses - a user can't subscribe to anyone
 * else's notifications by constructing a different filter client-side. */
export function useRealtimeNotifications(
  userId: string,
  knownNotificationIds: readonly string[],
  onNotification: (event: RealtimeNotificationEvent) => void,
) {
  const onNotificationRef = useRef(onNotification);
  const seenNotificationIdsRef = useRef(new Set<string>(knownNotificationIds));

  useEffect(() => {
    onNotificationRef.current = onNotification;
  });

  useEffect(() => {
    mergeSeenNotificationIds(seenNotificationIdsRef.current, knownNotificationIds);
  }, [knownNotificationIds]);

  useEffect(() => {
    if (!userId) return;

    // React (Strict Mode in dev, or a fast unmount/remount) tears this
    // effect down and immediately sets it back up - removeChannel() below
    // then reports its own status as CLOSED, which is expected teardown, not
    // a failure. Without this flag that indistinguishable CLOSED would
    // console.error on every single mount.
    let tornDown = false;
    let pollFailureLogged = false;

    const supabase = createClient();
    const emitIfUnseen = (row: NotificationRow) => {
      if (seenNotificationIdsRef.current.has(row.id)) {
        return;
      }

      seenNotificationIdsRef.current.add(row.id);
      onNotificationRef.current(parseRealtimeNotificationRow(row));
    };

    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        (payload) => {
          emitIfUnseen(payload.new as NotificationRow);
        },
      )
      // `.subscribe()`'s result never surfaced whether the channel actually
      // came up - a silent CHANNEL_ERROR/TIMED_OUT (RLS/auth misconfigured,
      // Realtime not reachable, etc.) would look identical to "notifications
      // just aren't arriving," with nothing to diagnose it from.
      .subscribe((status, err) => {
        if (tornDown) return;
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
          // Always worth knowing about, even in production - a silent drop
          // here means "payment received" toasts stop arriving live with no
          // other signal.
          console.error(`[realtime-notifications] subscription ${status}`, err);
        } else if (process.env.NODE_ENV !== "production") {
          console.log(`[realtime-notifications] subscription ${status}`);
        }
      });

    const pollForMissedNotifications = async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("id, transaction_id, type, title, body, unread, created_at, metadata")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(20);

      if (tornDown) {
        return;
      }

      if (error) {
        if (!pollFailureLogged) {
          pollFailureLogged = true;
          console.error("[realtime-notifications] polling fallback failed", error);
        }
        return;
      }

      pollFailureLogged = false;
      for (const row of [...((data ?? []) as NotificationRow[])].reverse()) {
        emitIfUnseen(row);
      }
    };

    void pollForMissedNotifications();
    const pollInterval = setInterval(() => void pollForMissedNotifications(), NOTIFICATION_FALLBACK_POLL_MS);

    return () => {
      tornDown = true;
      clearInterval(pollInterval);
      void supabase.removeChannel(channel);
    };
  }, [userId]);
}
