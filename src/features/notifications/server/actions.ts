"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSessionIdentity } from "@/features/auth/server/dal";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

const notificationIdSchema = z.object({
  notificationId: z.string().uuid(),
});

type ActionResult = { ok: true } | { ok: false; message: string };

async function markNotificationReadUnsafe(input: { notificationId: string }): Promise<ActionResult> {
  const parsed = notificationIdSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: "Choose a valid notification first." };
  }

  const identity = await getSessionIdentity();
  if (!identity) {
    return { ok: false, message: "Your session expired. Sign in again." };
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("notifications")
    .update({ unread: false })
    .eq("id", parsed.data.notificationId)
    .eq("user_id", identity.userId);

  if (error) {
    return { ok: false, message: "We couldn't mark that notification yet." };
  }

  revalidatePath("/home");
  return { ok: true };
}

export async function markNotificationRead(input: { notificationId: string }): Promise<ActionResult> {
  try {
    return await markNotificationReadUnsafe(input);
  } catch (error) {
    logger.error("Unhandled error marking notification read", error, { notificationId: input.notificationId });
    return { ok: false, message: "We couldn't mark that notification yet." };
  }
}

async function markAllNotificationsReadUnsafe(): Promise<ActionResult> {
  const identity = await getSessionIdentity();
  if (!identity) {
    return { ok: false, message: "Your session expired. Sign in again." };
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("notifications")
    .update({ unread: false })
    .eq("user_id", identity.userId)
    .eq("unread", true);

  if (error) {
    return { ok: false, message: "We couldn't clear your unread notifications yet." };
  }

  revalidatePath("/home");
  return { ok: true };
}

export async function markAllNotificationsRead(): Promise<ActionResult> {
  try {
    return await markAllNotificationsReadUnsafe();
  } catch (error) {
    logger.error("Unhandled error marking all notifications read", error);
    return { ok: false, message: "We couldn't clear your unread notifications yet." };
  }
}
