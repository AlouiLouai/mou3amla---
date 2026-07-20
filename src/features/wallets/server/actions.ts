"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSessionIdentity } from "@/features/auth/server/dal";
import { getProviderById, isProviderServiceDown } from "@/features/wallets/constants";
import type { LinkedWallet, RoutingType } from "@/features/wallets/types";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

type ProfileVerificationRow = {
  verification_status: "unverified" | "pending" | "verified" | "rejected";
};

type LinkedDestinationRow = {
  id: string;
  provider_id: string;
  name: string;
  network: string;
  color: string;
  initials: string;
  routing_type: LinkedWallet["routingType"];
  routing_value: string;
  is_default: boolean;
};

const linkDestinationSchema = z.object({
  providerId: z.string().trim().min(1),
  routingValue: z.string().trim().min(1),
});

const selectPrimarySchema = z.object({
  destinationId: z.string().uuid(),
});

const deleteDestinationSchema = z.object({
  destinationId: z.string().uuid(),
});

function validateRoutingValue(type: RoutingType, value: string): string | null {
  if (type === "rib" && !/^\d{20}$/.test(value)) {
    return "A RIB is exactly 20 digits.";
  }

  if (type === "wallet_tag" && !/^@?[a-z0-9_.-]{3,32}$/i.test(value)) {
    return "Enter a valid wallet tag.";
  }

  return null;
}

function normalizeRoutingValue(type: RoutingType, value: string): string {
  const trimmed = value.trim();

  if (type === "wallet_tag") {
    const normalized = trimmed.replace(/^@+/, "").toLowerCase();
    return `@${normalized}`;
  }

  if (type === "merchant_id") {
    return trimmed.toUpperCase();
  }

  return trimmed.replace(/\D/g, "");
}

function toWallet(row: LinkedDestinationRow): LinkedWallet {
  return {
    id: row.id,
    providerId: row.provider_id,
    name: row.name,
    network: row.network,
    color: row.color,
    initials: row.initials,
    routingType: row.routing_type,
    routingValue: row.routing_value,
    isDefault: row.is_default,
  };
}

type LinkDestinationResult = { ok: true; wallet: LinkedWallet; sourceWalletId: string } | { ok: false; message: string };

async function linkDestinationUnsafe(input: { providerId: string; routingValue: string }): Promise<LinkDestinationResult> {
  const parsed = linkDestinationSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: "Complete the provider and routing fields first." };
  }

  const identity = await getSessionIdentity();
  if (!identity) {
    return { ok: false, message: "Your session expired. Sign in again." };
  }

  // Now that a routing value's existence is checked across *all* users (not
  // just the caller's own), an unlimited number of attempts would turn this
  // into an oracle for probing whether a specific RIB/wallet tag is already
  // registered by someone else - rate-limit per user to blunt that.
  const withinLimit = await checkRateLimit(`link-destination:${identity.userId}`, { max: 10, windowSeconds: 300 });
  if (!withinLimit) {
    return { ok: false, message: "Too many linking attempts. Please wait a few minutes and try again." };
  }

  const provider = getProviderById(parsed.data.providerId);
  if (!provider) {
    return { ok: false, message: "That provider is not supported yet." };
  }

  if (isProviderServiceDown(provider.id)) {
    return { ok: false, message: `${provider.name} is temporarily unavailable in this demo. Link another account for now.` };
  }

  const routingType = provider.acceptedRoutingTypes[0];
  const routingValue = normalizeRoutingValue(routingType, parsed.data.routingValue);
  const validationError = validateRoutingValue(routingType, routingValue);
  if (validationError) {
    return { ok: false, message: validationError };
  }

  const admin = createAdminClient();
  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("verification_status")
    .eq("id", identity.userId)
    .maybeSingle<ProfileVerificationRow>();

  if (profileError || !profile) {
    return { ok: false, message: "We couldn't verify your identity status right now." };
  }

  if (profile.verification_status !== "verified") {
    return { ok: false, message: "Complete identity verification before linking a wallet or bank account." };
  }

  // A RIB or wallet tag is real-world exclusive - one destination belongs to
  // one account, so this checks across *all* users, not just the caller's
  // own destinations, and gives an accurate message either way without
  // revealing whose account already holds it.
  const { data: existingDestination, error: existingError } = await admin
    .from("linked_destinations")
    .select("user_id")
    .eq("provider_id", provider.id)
    .eq("routing_value", routingValue)
    .maybeSingle<{ user_id: string }>();

  if (existingError) {
    return { ok: false, message: "We couldn't verify that destination right now. Please retry." };
  }

  if (existingDestination) {
    return {
      ok: false,
      message:
        existingDestination.user_id === identity.userId
          ? "You've already linked this destination."
          : "This RIB or wallet is already linked to another Mou3amla account.",
    };
  }

  const { count, error: countError } = await admin
    .from("linked_destinations")
    .select("id", { count: "exact", head: true })
    .eq("user_id", identity.userId);

  if (countError) {
    return { ok: false, message: "We couldn't inspect your existing destinations right now." };
  }

  const { data: inserted, error: insertError } = await admin
    .from("linked_destinations")
    .insert({
      user_id: identity.userId,
      provider_id: provider.id,
      name: provider.name,
      network: provider.network.split(" · ")[0] ?? provider.network,
      color: provider.color,
      initials: provider.initials,
      routing_type: routingType,
      routing_value: routingValue,
      is_default: (count ?? 0) === 0,
    })
    .select("id, provider_id, name, network, color, initials, routing_type, routing_value, is_default")
    .single<LinkedDestinationRow>();

  // Race-condition fallback: two concurrent requests could both pass the
  // pre-check above before either insert commits.
  if (insertError?.code === "23505") {
    return { ok: false, message: "That destination was just linked (by you or another account). Please retry with a different one." };
  }

  if (insertError || !inserted) {
    return { ok: false, message: "We couldn't save that destination yet. Please retry." };
  }

  revalidatePath("/home");
  return {
    ok: true,
    wallet: toWallet(inserted),
    sourceWalletId: inserted.is_default ? inserted.id : "",
  };
}

export async function linkDestination(input: { providerId: string; routingValue: string }): Promise<LinkDestinationResult> {
  try {
    return await linkDestinationUnsafe(input);
  } catch (error) {
    logger.error("Unhandled error linking destination", error, { providerId: input.providerId });
    return { ok: false, message: "We couldn't link that destination right now. Please try again." };
  }
}

type SetPrimaryDestinationResult = { ok: true } | { ok: false; message: string };
type DeleteDestinationResult = { ok: true; deletedId: string; nextSourceWalletId: string } | { ok: false; message: string };

async function setPrimaryDestinationUnsafe(input: { destinationId: string }): Promise<SetPrimaryDestinationResult> {
  const parsed = selectPrimarySchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: "Choose a valid destination first." };
  }

  const identity = await getSessionIdentity();
  if (!identity) {
    return { ok: false, message: "Your session expired. Sign in again." };
  }

  const admin = createAdminClient();
  const { data: destination, error: destinationError } = await admin
    .from("linked_destinations")
    .select("id")
    .eq("id", parsed.data.destinationId)
    .eq("user_id", identity.userId)
    .maybeSingle<{ id: string }>();

  if (destinationError || !destination) {
    return { ok: false, message: "That destination doesn't belong to your account." };
  }

  const { error: resetError } = await admin
    .from("linked_destinations")
    .update({ is_default: false })
    .eq("user_id", identity.userId)
    .eq("is_default", true);

  if (resetError) {
    return { ok: false, message: "We couldn't update your primary route right now." };
  }

  const { error: applyError } = await admin
    .from("linked_destinations")
    .update({ is_default: true })
    .eq("id", parsed.data.destinationId)
    .eq("user_id", identity.userId);

  if (applyError) {
    return { ok: false, message: "We couldn't apply that primary route yet." };
  }

  revalidatePath("/home");
  return { ok: true };
}

export async function setPrimaryDestination(input: { destinationId: string }): Promise<SetPrimaryDestinationResult> {
  try {
    return await setPrimaryDestinationUnsafe(input);
  } catch (error) {
    logger.error("Unhandled error setting primary destination", error, { destinationId: input.destinationId });
    return { ok: false, message: "We couldn't update your primary route right now." };
  }
}

async function deleteDestinationUnsafe(input: { destinationId: string }): Promise<DeleteDestinationResult> {
  const parsed = deleteDestinationSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: "Choose a valid destination first." };
  }

  const identity = await getSessionIdentity();
  if (!identity) {
    return { ok: false, message: "Your session expired. Sign in again." };
  }

  const withinLimit = await checkRateLimit(`delete-destination:${identity.userId}`, { max: 10, windowSeconds: 300 });
  if (!withinLimit) {
    return { ok: false, message: "Too many delete attempts. Please wait a few minutes and try again." };
  }

  const admin = createAdminClient();
  const { data: destination, error: destinationError } = await admin
    .from("linked_destinations")
    .select("id, is_default")
    .eq("id", parsed.data.destinationId)
    .eq("user_id", identity.userId)
    .maybeSingle<{ id: string; is_default: boolean }>();

  if (destinationError || !destination) {
    return { ok: false, message: "That destination doesn't belong to your account." };
  }

  const { error: deleteError } = await admin
    .from("linked_destinations")
    .delete()
    .eq("id", parsed.data.destinationId)
    .eq("user_id", identity.userId);

  if (deleteError) {
    return { ok: false, message: "We couldn't remove that destination right now." };
  }

  let nextSourceWalletId = "";

  if (destination.is_default) {
    const { data: fallbackDestination, error: fallbackError } = await admin
      .from("linked_destinations")
      .select("id")
      .eq("user_id", identity.userId)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle<{ id: string }>();

    if (fallbackError) {
      return { ok: false, message: "We removed the destination, but couldn't reload your next default route." };
    }

    if (fallbackDestination) {
      const { error: resetError } = await admin
        .from("linked_destinations")
        .update({ is_default: false })
        .eq("user_id", identity.userId)
        .eq("is_default", true);

      if (resetError) {
        return { ok: false, message: "We removed the destination, but couldn't refresh your default route yet." };
      }

      const { error: applyError } = await admin
        .from("linked_destinations")
        .update({ is_default: true })
        .eq("id", fallbackDestination.id)
        .eq("user_id", identity.userId);

      if (applyError) {
        return { ok: false, message: "We removed the destination, but couldn't promote the next route yet." };
      }

      nextSourceWalletId = fallbackDestination.id;
    }
  }

  revalidatePath("/home");
  return { ok: true, deletedId: parsed.data.destinationId, nextSourceWalletId };
}

export async function deleteDestination(input: { destinationId: string }): Promise<DeleteDestinationResult> {
  try {
    return await deleteDestinationUnsafe(input);
  } catch (error) {
    logger.error("Unhandled error deleting destination", error, { destinationId: input.destinationId });
    return { ok: false, message: "We couldn't remove that destination right now. Please try again." };
  }
}
