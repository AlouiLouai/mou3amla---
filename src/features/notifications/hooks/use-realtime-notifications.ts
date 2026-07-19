"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type { NotificationItem } from "@/features/notifications/types";
import type { ActivityItem } from "@/features/activity/types";

type NotificationRow = {
  id: string;
  type: NotificationItem["type"];
  title: string;
  body: string;
  unread: boolean;
  created_at: string;
  metadata: { activity?: ActivityItem } | null;
};

export type RealtimeNotificationEvent = {
  notification: NotificationItem;
  /** Present on `payment_received` - the recipient's own Activity row for
   * this transaction, embedded at write time so the client can show it
   * immediately instead of waiting for a separate fetch. */
  activity?: ActivityItem;
};

function toEvent(row: NotificationRow): RealtimeNotificationEvent {
  return {
    notification: {
      id: row.id,
      type: row.type,
      title: row.title,
      body: row.body,
      unread: row.unread,
      createdAt: row.created_at,
    },
    activity: row.metadata?.activity,
  };
}

/** Delivers new rows in `public.notifications` the moment they're inserted -
 * e.g. a "payment received" notification lands live, not on the next page
 * load. Scoped to the current user's own rows via a Postgres Changes filter,
 * which Supabase Realtime enforces against the same `notifications_select_own`
 * RLS policy the REST API already uses - a user can't subscribe to anyone
 * else's notifications by constructing a different filter client-side. */
export function useRealtimeNotifications(userId: string, onNotification: (event: RealtimeNotificationEvent) => void) {
  const onNotificationRef = useRef(onNotification);

  useEffect(() => {
    onNotificationRef.current = onNotification;
  });

  useEffect(() => {
    if (!userId) return;

    // React (Strict Mode in dev, or a fast unmount/remount) tears this
    // effect down and immediately sets it back up - removeChannel() below
    // then reports its own status as CLOSED, which is expected teardown, not
    // a failure. Without this flag that indistinguishable CLOSED would
    // console.error on every single mount.
    let tornDown = false;

    const supabase = createClient();
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        (payload) => {
          onNotificationRef.current(toEvent(payload.new as NotificationRow));
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

    return () => {
      tornDown = true;
      void supabase.removeChannel(channel);
    };
  }, [userId]);
}
