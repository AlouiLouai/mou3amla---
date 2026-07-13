"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSessionIdentity } from "@/features/auth/server/dal";
import { createAdminClient } from "@/lib/supabase/admin";

const notificationIdSchema = z.object({
  notificationId: z.string().uuid(),
});

export async function markNotificationRead(input: {
  notificationId: string;
}): Promise<{ ok: true } | { ok: false; message: string }> {
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

export async function markAllNotificationsRead(): Promise<{ ok: true } | { ok: false; message: string }> {
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
