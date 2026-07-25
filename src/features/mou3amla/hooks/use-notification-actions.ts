import { useCallback, type RefObject } from "react";
import { toast } from "@/lib/toast";
import { markAllNotificationsRead, markNotificationRead } from "@/features/notifications/server/actions";
import type { Mou3amlaState } from "@/features/mou3amla/types";
import type { Patch } from "@/features/mou3amla/hooks/reducer";

export function useNotificationActions({
  dispatch,
  stateRef,
}: {
  dispatch: (patch: Patch) => void;
  stateRef: RefObject<Mou3amlaState>;
}) {
  const readNotification = useCallback(
    (notificationId: string) => {
      const notification = stateRef.current.notifications.find((item) => item.id === notificationId);
      if (!notification || !notification.unread) {
        return;
      }

      dispatch((s) => ({
        notifications: s.notifications.map((item) => (item.id === notificationId ? { ...item, unread: false } : item)),
      }));

      void (async () => {
        try {
          const result = await markNotificationRead({ notificationId });
          if (!result.ok) {
            dispatch((s) => ({
              notifications: s.notifications.map((item) => (item.id === notificationId ? { ...item, unread: true } : item)),
            }));
            toast.error(result.message);
          }
        } catch {
          dispatch((s) => ({
            notifications: s.notifications.map((item) => (item.id === notificationId ? { ...item, unread: true } : item)),
          }));
          toast.error("We couldn't reach Mou3amla right now. Please try again.");
        }
      })();
    },
    [dispatch, stateRef],
  );

  const readAllNotifications = useCallback(() => {
    const previous = stateRef.current.notifications;
    if (!previous.some((item) => item.unread)) {
      return;
    }

    dispatch((s) => ({
      notifications: s.notifications.map((item) => ({ ...item, unread: false })),
    }));

    void (async () => {
      try {
        const result = await markAllNotificationsRead();
        if (!result.ok) {
          dispatch({ notifications: previous });
          toast.error(result.message);
          return;
        }

        toast.success("Notifications updated.");
      } catch {
        dispatch({ notifications: previous });
        toast.error("We couldn't reach Mou3amla right now. Please try again.");
      }
    })();
  }, [dispatch, stateRef]);

  return { readNotification, readAllNotifications };
}
