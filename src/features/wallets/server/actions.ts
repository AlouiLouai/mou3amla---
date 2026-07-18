"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSessionIdentity } from "@/features/auth/server/dal";
import { PROVIDERS } from "@/features/wallets/constants";
import type { LinkedWallet, RoutingType } from "@/features/wallets/types";
import { createAdminClient } from "@/lib/supabase/admin";
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

  const provider = PROVIDERS.find((entry) => entry.id === parsed.data.providerId);
  if (!provider) {
    return { ok: false, message: "That provider is not supported yet." };
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

  if (insertError?.code === "23505") {
    return { ok: false, message: "That destination is already linked to your profile." };
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
