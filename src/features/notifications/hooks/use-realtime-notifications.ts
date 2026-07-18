"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type { NotificationItem } from "@/features/notifications/types";

type NotificationRow = {
  id: string;
  type: NotificationItem["type"];
  title: string;
  body: string;
  unread: boolean;
  created_at: string;
};

function toNotification(row: NotificationRow): NotificationItem {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    body: row.body,
    unread: row.unread,
    createdAt: row.created_at,
  };
}

/** Delivers new rows in `public.notifications` the moment they're inserted -
 * e.g. a "payment received" notification lands live, not on the next page
 * load. Scoped to the current user's own rows via a Postgres Changes filter,
 * which Supabase Realtime enforces against the same `notifications_select_own`
 * RLS policy the REST API already uses - a user can't subscribe to anyone
 * else's notifications by constructing a different filter client-side. */
export function useRealtimeNotifications(userId: string, onNotification: (notification: NotificationItem) => void) {
  const onNotificationRef = useRef(onNotification);

  useEffect(() => {
    onNotificationRef.current = onNotification;
  });

  useEffect(() => {
    if (!userId) return;

    const supabase = createClient();
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        (payload) => {
          onNotificationRef.current(toNotification(payload.new as NotificationRow));
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId]);
}
