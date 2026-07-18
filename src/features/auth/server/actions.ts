"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { buildDisplayName, landingInputSchema, normalizePhoneForAuth } from "@/features/auth/lib/identity";
import { clearPasskeyBridgeCookie, readPasskeyBridgeCookie, setPasskeyBridgeCookie } from "@/features/auth/server/passkey-bridge";
import type { AuthFormState, PasskeyBridgeResult, VerificationStatus } from "@/features/auth/types";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request-ip";

type ProfileLookup = {
  id: string;
  phone: string;
  username: string;
  verification_status: VerificationStatus;
};

type AuthUserSummary = {
  id: string;
  phone: string | null;
  email?: string | null;
  user_metadata?: {
    preferred_username?: string;
  } | null;
};

type AdminClient = ReturnType<typeof createAdminClient>;

function buildBridgeEmail(phone: string, username: string) {
  const digits = phone.replace(/\D/g, "");
  const handle = username.replace(/^@+/, "").toLowerCase();
  return `bridge-${digits}-${handle}@mou3amla.local`;
}

async function findAuthUser(admin: AdminClient, phone: string, email: string) {
  for (let page = 1; page <= 5; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });

    if (error) {
      return { user: null, error };
    }

    const user =
      ((data.users as AuthUserSummary[]).find((entry) => {
        const candidate = entry.phone ? `+${entry.phone.replace(/^\+/, "")}` : null;
        return candidate === phone || entry.email === email;
      }) as AuthUserSummary | undefined) ?? null;

    if (user) {
      return { user, error: null };
    }

    if (data.users.length < 200) {
      break;
    }
  }

  return { user: null, error: null };
}

/** Creates the auth user + profile row for a phone/username never seen before. Recovers cleanly if a prior attempt already created the auth user but failed before the profile row landed. */
async function createIdentity(
  admin: AdminClient,
  phone: string,
  username: string,
): Promise<{ ok: true; profileId: string } | { ok: false; message: string }> {
  const bridgeEmail = buildBridgeEmail(phone, username);
  const { data: createdUser, error: createUserError } = await admin.auth.admin.createUser({
    email: bridgeEmail,
    email_confirm: true,
    user_metadata: { preferred_username: username, phone },
  });

  let profileId: string;

  if (createUserError?.code === "phone_exists" || createUserError?.code === "email_exists") {
    const recovered = await findAuthUser(admin, phone, bridgeEmail);

    if (recovered.error || !recovered.user) {
      return { ok: false, message: "That phone already exists in auth, but we couldn't recover it safely yet. Please retry once." };
    }

    const existingPreferredUsername = recovered.user.user_metadata?.preferred_username?.replace(/^@+/, "").toLowerCase();
    if (existingPreferredUsername && existingPreferredUsername !== username) {
      return { ok: false, message: "That phone number is already attached to a different Mou3amla handle." };
    }

    profileId = recovered.user.id;
  } else if (createUserError || !createdUser.user) {
    return { ok: false, message: "We couldn't create your account yet. Please try again." };
  } else {
    profileId = createdUser.user.id;
  }

  const { error: insertProfileError } = await admin.from("profiles").insert({
    id: profileId,
    phone,
    username,
    display_name: buildDisplayName(username),
    verification_status: "unverified",
  });

  if (insertProfileError) {
    if (insertProfileError.code === "23505") {
      return { ok: false, message: "That Mou3amla handle is already taken. Try another username." };
    }

    return { ok: false, message: "We created your auth record, but couldn't finish profile setup. Please retry." };
  }

  return { ok: true, profileId };
}

export async function startPhoneAuth(
  _prevState: AuthFormState | undefined,
  formData: FormData,
): Promise<AuthFormState | undefined> {
  const parsed = landingInputSchema.safeParse({
    phone: formData.get("phone"),
    username: formData.get("username"),
  });

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  // Pre-auth, so this is the one place in the flow an attacker could script
  // against without ever holding a session - cap attempts per IP before
  // touching the database at all.
  const clientIp = await getClientIp();
  const withinLimit = await checkRateLimit(`start-phone-auth:${clientIp}`, { max: 10, windowSeconds: 300 });
  if (!withinLimit) {
    return { message: "Too many attempts. Please wait a few minutes and try again." };
  }

  const phone = normalizePhoneForAuth(parsed.data.phone);
  const username = parsed.data.username;
  const admin = createAdminClient();

  const lookup = await admin
    .from("profiles")
    .select("id, phone, username, verification_status")
    .or(`phone.eq.${phone},username.eq.${username}`);

  if (lookup.error) {
    return { message: "We couldn't check your account right now. Please try again." };
  }

  const profiles = (lookup.data ?? []) as ProfileLookup[];
  const phoneMatch = profiles.find((profile) => profile.phone === phone) ?? null;
  const usernameMatch = profiles.find((profile) => profile.username === username) ?? null;

  if ((phoneMatch && usernameMatch && phoneMatch.id !== usernameMatch.id) || (phoneMatch && !usernameMatch) || (!phoneMatch && usernameMatch)) {
    return { message: "That phone number and username don't belong to the same Mou3amla identity." };
  }

  let profileId = phoneMatch?.id ?? usernameMatch?.id ?? null;

  if (!profileId) {
    const created = await createIdentity(admin, phone, username);
    if (!created.ok) {
      return { message: created.message };
    }
    profileId = created.profileId;
  }

  // The real precondition for signInWithPasskey() is "this profile has a
  // registered passkey" - not "a profile row exists." Deciding on row
  // existence alone would strand anyone who abandoned the biometric prompt
  // mid-registration: they'd get routed to sign-in with no passkey to sign
  // in with. Checking the actual precondition fixes that for free.
  const { data: passkeys } = await admin.auth.admin.passkey.listPasskeys({ userId: profileId });

  if (passkeys && passkeys.length > 0) {
    await setPasskeyBridgeCookie({ phone, username, mode: "authenticate" });
    redirect(`/verify?${new URLSearchParams({ phone, username })}`);
  }

  const bridgeEmail = buildBridgeEmail(phone, username);
  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: bridgeEmail,
  });

  if (linkError || !linkData?.properties?.hashed_token) {
    return { message: "We couldn't prepare your passkey setup. Please retry once." };
  }

  await setPasskeyBridgeCookie({
    phone,
    username,
    mode: "register",
    tokenHash: linkData.properties.hashed_token,
  });

  redirect(`/verify?${new URLSearchParams({ phone, username })}`);
}

export async function establishBridgeSession(phone: string, username: string): Promise<PasskeyBridgeResult> {
  const bridge = await readPasskeyBridgeCookie(phone, username);

  if (!bridge || bridge.mode !== "register" || !bridge.tokenHash) {
    return { ok: false, message: "Your setup link expired. Please start again." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({
    token_hash: bridge.tokenHash,
    type: "magiclink",
  });

  if (error) {
    return { ok: false, message: "We couldn't open a secure session for passkey setup. Please retry once." };
  }

  return { ok: true };
}

export async function finalizeAuth(phone: string, username: string): Promise<PasskeyBridgeResult> {
  const supabase = await createClient();
  const { data: claims, error: claimsError } = await supabase.auth.getClaims();

  if (claimsError || !claims?.claims?.sub) {
    return { ok: false, message: "Your passkey session didn't come through. Please retry." };
  }

  const admin = createAdminClient();
  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("id, phone, username")
    .eq("id", claims.claims.sub)
    .maybeSingle<{ id: string; phone: string; username: string }>();

  if (profileError || !profile || profile.phone !== phone || profile.username.toLowerCase() !== username.toLowerCase()) {
    await supabase.auth.signOut();
    return { ok: false, message: "That passkey belongs to a different Mou3amla identity." };
  }

  await clearPasskeyBridgeCookie();
  revalidatePath("/home");
  redirect("/home");
}
