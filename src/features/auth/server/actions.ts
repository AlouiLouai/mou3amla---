"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { AuthenticationResponseJSON, RegistrationResponseJSON } from "@simplewebauthn/server";
import { buildDisplayName, landingInputSchema, normalizePhoneForAuth } from "@/features/auth/lib/identity";
import {
  clearChallengeCookie,
  readChallengeCookie,
  setChallengeCookie,
  setPasskeyModeCookie,
} from "@/features/auth/server/passkey-bridge";
import { buildAuthenticationOptions, buildRegistrationOptions, hasPasskey, verifyAuthentication, verifyRegistration } from "@/features/auth/server/webauthn";
import type { AuthFormState, VerificationStatus } from "@/features/auth/types";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request-ip";
import { logger } from "@/lib/logger";

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

type FindAuthUserRow = {
  id: string;
  phone: string | null;
  email: string | null;
  raw_user_meta_data: { preferred_username?: string } | null;
};

/** O(1) indexed lookup via the find_auth_user_id RPC (see the migration
 * alongside this file) instead of paginating admin.auth.admin.listUsers() -
 * that used to cap out at 1000 total Supabase Auth users, silently failing
 * to recover a legitimate race-condition retry past that point. */
async function findAuthUser(admin: AdminClient, phone: string, email: string): Promise<{ user: AuthUserSummary | null; error: unknown }> {
  const { data, error } = await admin.rpc("find_auth_user_id", { target_email: email, target_phone: phone }).maybeSingle<FindAuthUserRow>();

  if (error) {
    return { user: null, error };
  }

  if (!data) {
    return { user: null, error: null };
  }

  return {
    user: { id: data.id, phone: data.phone, email: data.email, user_metadata: data.raw_user_meta_data },
    error: null,
  };
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

/** Re-resolves the exact (phone, username) pair to a profile id on every
 * passkey-related action - never trust a client-supplied id alone, and never
 * confirm a partial match (see the mismatch messages in startPhoneAuthUnsafe). */
async function resolveExactProfile(admin: AdminClient, phone: string, username: string): Promise<{ id: string } | null> {
  const { data, error } = await admin
    .from("profiles")
    .select("id")
    .eq("phone", phone)
    .eq("username", username)
    .maybeSingle<{ id: string }>();

  if (error || !data) {
    return null;
  }

  return { id: data.id };
}

type StartPhoneAuthOutcome = AuthFormState | { redirectTo: string };

// `redirect()` throws internally, so - per Next.js's own docs - it must be
// called outside any try/catch. This inner function returns a plain
// `{ redirectTo }` instruction instead of calling `redirect()` itself; the
// exported wrapper below is the only place that actually calls it, after the
// try/catch has already run.
async function startPhoneAuthUnsafe(formData: FormData): Promise<StartPhoneAuthOutcome> {
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

  // Never confirm *which* identity a phone/username belongs to beyond "an
  // account already exists" - revealing more would let an unauthenticated
  // caller enumerate registered phone numbers or handles.
  if (phoneMatch && usernameMatch && phoneMatch.id !== usernameMatch.id) {
    return { message: "This phone number and handle belong to two different Mou3amla accounts. Double-check both, or use the pair you originally signed up with." };
  }

  if (phoneMatch && !usernameMatch) {
    return { message: "This phone number is already linked to a Mou3amla account under a different handle. If it's yours, enter the handle you signed up with." };
  }

  if (usernameMatch && !phoneMatch) {
    return { message: "That handle is already taken. If it's yours, double-check the phone number you signed up with." };
  }

  let profileId = phoneMatch?.id ?? usernameMatch?.id ?? null;

  if (!profileId) {
    const created = await createIdentity(admin, phone, username);
    if (!created.ok) {
      return { message: created.message };
    }
    profileId = created.profileId;
  }

  // The real precondition for signing in with a passkey is "this profile has
  // a registered credential in our own passkeys table" - not "a profile row
  // exists." Deciding on row existence alone would strand anyone who
  // abandoned the ceremony mid-registration: they'd get routed to sign-in
  // with no passkey to sign in with. Checking the actual precondition fixes
  // that for free.
  const mode: "register" | "authenticate" = (await hasPasskey(profileId)) ? "authenticate" : "register";
  await setPasskeyModeCookie({ phone, username, mode });

  return { redirectTo: `/verify?${new URLSearchParams({ phone, username })}` };
}

export async function startPhoneAuth(_prevState: AuthFormState | undefined, formData: FormData): Promise<AuthFormState | undefined> {
  let outcome: StartPhoneAuthOutcome;

  try {
    outcome = await startPhoneAuthUnsafe(formData);
  } catch (error) {
    logger.error("Unhandled error in startPhoneAuth", error);
    return { message: "We couldn't process that right now. Please try again." };
  }

  if ("redirectTo" in outcome) {
    redirect(outcome.redirectTo);
  }

  return outcome;
}

/** Mints the real Supabase session for a resolved identity via the same
 * synthetic-email magic-link handshake used since the bridge design - this
 * part was never the problem (only Supabase's own experimental native-passkey
 * verify endpoint was), so it's reused as-is, now called *after* our own
 * self-hosted WebAuthn verification succeeds rather than before it. */
async function mintSessionForIdentity(phone: string, username: string): Promise<{ ok: true } | { ok: false; message: string }> {
  const admin = createAdminClient();
  const bridgeEmail = buildBridgeEmail(phone, username);
  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({ type: "magiclink", email: bridgeEmail });

  if (linkError || !linkData?.properties?.hashed_token) {
    return { ok: false, message: "We couldn't open a secure session. Please retry." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ token_hash: linkData.properties.hashed_token, type: "magiclink" });

  if (error) {
    return { ok: false, message: "We couldn't open a secure session. Please retry." };
  }

  return { ok: true };
}

type PasskeyOptionsResult<T> = { ok: true; options: T } | { ok: false; message: string };

async function getPasskeyRegistrationOptionsUnsafe(phone: string, username: string): Promise<PasskeyOptionsResult<Awaited<ReturnType<typeof buildRegistrationOptions>>>> {
  const clientIp = await getClientIp();
  const withinLimit = await checkRateLimit(`passkey-reg-options:${clientIp}`, { max: 15, windowSeconds: 300 });
  if (!withinLimit) {
    return { ok: false, message: "Too many attempts. Please wait a few minutes and try again." };
  }

  const admin = createAdminClient();
  const profile = await resolveExactProfile(admin, phone, username);

  if (!profile) {
    return { ok: false, message: "We couldn't find that identity. Please start again." };
  }

  const options = await buildRegistrationOptions(profile.id, username);
  await setChallengeCookie({ phone, username, challenge: options.challenge });

  return { ok: true, options };
}

export async function getPasskeyRegistrationOptions(
  phone: string,
  username: string,
): ReturnType<typeof getPasskeyRegistrationOptionsUnsafe> {
  try {
    return await getPasskeyRegistrationOptionsUnsafe(phone, username);
  } catch (error) {
    logger.error("Unhandled error in getPasskeyRegistrationOptions", error);
    return { ok: false, message: "We couldn't start passkey setup. Please retry." };
  }
}

type VerifyPasskeyOutcome = { ok: false; message: string } | { redirectTo: string };

async function verifyPasskeyRegistrationUnsafe(phone: string, username: string, response: RegistrationResponseJSON): Promise<VerifyPasskeyOutcome> {
  const clientIp = await getClientIp();
  const withinLimit = await checkRateLimit(`passkey-reg-verify:${clientIp}`, { max: 15, windowSeconds: 300 });
  if (!withinLimit) {
    return { ok: false, message: "Too many attempts. Please wait a few minutes and try again." };
  }

  const admin = createAdminClient();
  const profile = await resolveExactProfile(admin, phone, username);

  if (!profile) {
    return { ok: false, message: "We couldn't find that identity. Please start again." };
  }

  const challenge = await readChallengeCookie(phone, username);
  if (!challenge) {
    return { ok: false, message: "Your passkey setup expired. Please start again." };
  }

  const result = await verifyRegistration(profile.id, challenge, response);
  await clearChallengeCookie();

  if (!result.ok) {
    return result;
  }

  const session = await mintSessionForIdentity(phone, username);
  if (!session.ok) {
    return session;
  }

  revalidatePath("/home");
  return { redirectTo: "/home" };
}

export async function verifyPasskeyRegistration(
  phone: string,
  username: string,
  response: RegistrationResponseJSON,
): Promise<{ ok: false; message: string } | undefined> {
  let outcome: VerifyPasskeyOutcome;

  try {
    outcome = await verifyPasskeyRegistrationUnsafe(phone, username, response);
  } catch (error) {
    logger.error("Unhandled error in verifyPasskeyRegistration", error);
    return { ok: false, message: "We couldn't finish setting up your passkey. Please retry." };
  }

  if ("redirectTo" in outcome) {
    redirect(outcome.redirectTo);
  }

  return outcome;
}

async function getPasskeyAuthenticationOptionsUnsafe(
  phone: string,
  username: string,
): Promise<PasskeyOptionsResult<NonNullable<Awaited<ReturnType<typeof buildAuthenticationOptions>>>>> {
  const clientIp = await getClientIp();
  const withinLimit = await checkRateLimit(`passkey-auth-options:${clientIp}`, { max: 20, windowSeconds: 300 });
  if (!withinLimit) {
    return { ok: false, message: "Too many attempts. Please wait a few minutes and try again." };
  }

  const admin = createAdminClient();
  const profile = await resolveExactProfile(admin, phone, username);

  if (!profile) {
    return { ok: false, message: "We couldn't find that identity. Please start again." };
  }

  const options = await buildAuthenticationOptions(profile.id);
  if (!options) {
    return { ok: false, message: "No passkey is registered for this identity yet." };
  }

  await setChallengeCookie({ phone, username, challenge: options.challenge });

  return { ok: true, options };
}

export async function getPasskeyAuthenticationOptions(
  phone: string,
  username: string,
): ReturnType<typeof getPasskeyAuthenticationOptionsUnsafe> {
  try {
    return await getPasskeyAuthenticationOptionsUnsafe(phone, username);
  } catch (error) {
    logger.error("Unhandled error in getPasskeyAuthenticationOptions", error);
    return { ok: false, message: "We couldn't prepare passkey sign-in. Please retry." };
  }
}

async function verifyPasskeyAuthenticationUnsafe(phone: string, username: string, response: AuthenticationResponseJSON): Promise<VerifyPasskeyOutcome> {
  const clientIp = await getClientIp();
  const withinLimit = await checkRateLimit(`passkey-auth-verify:${clientIp}`, { max: 20, windowSeconds: 300 });
  if (!withinLimit) {
    return { ok: false, message: "Too many attempts. Please wait a few minutes and try again." };
  }

  const admin = createAdminClient();
  const profile = await resolveExactProfile(admin, phone, username);

  if (!profile) {
    return { ok: false, message: "We couldn't find that identity. Please start again." };
  }

  const challenge = await readChallengeCookie(phone, username);
  if (!challenge) {
    return { ok: false, message: "Your sign-in attempt expired. Please start again." };
  }

  const result = await verifyAuthentication(profile.id, challenge, response);
  await clearChallengeCookie();

  if (!result.ok) {
    return result;
  }

  const session = await mintSessionForIdentity(phone, username);
  if (!session.ok) {
    return session;
  }

  revalidatePath("/home");
  return { redirectTo: "/home" };
}

export async function verifyPasskeyAuthentication(
  phone: string,
  username: string,
  response: AuthenticationResponseJSON,
): Promise<{ ok: false; message: string } | undefined> {
  let outcome: VerifyPasskeyOutcome;

  try {
    outcome = await verifyPasskeyAuthenticationUnsafe(phone, username, response);
  } catch (error) {
    logger.error("Unhandled error in verifyPasskeyAuthentication", error);
    return { ok: false, message: "We couldn't verify your passkey. Please retry." };
  }

  if ("redirectTo" in outcome) {
    redirect(outcome.redirectTo);
  }

  return outcome;
}

/** The WebAuthn ceremony itself (navigator.credentials.create()/.get()) runs
 * entirely client-side and never otherwise reaches our own logs. Call this
 * from the client on failure so a real diagnosis is possible. */
export async function logPasskeyCeremonyFailure(mode: "register" | "authenticate", detail: string): Promise<void> {
  try {
    logger.warn(`Passkey ceremony failed (${mode})`, { detail });
  } catch {
    // The one server action in this file with nothing to fall back to if
    // logging itself throws - swallow rather than let a diagnostic-only
    // call become the thing that breaks the passkey ceremony's own error
    // path (this is already inside a client-side catch block's `void` call).
  }
}

type SetCardGradientResult = { ok: true } | { ok: false; message: string };

/** ProfileBuilderScreen's IKEA-effect step: persists the personal card style
 * (cyan/magenta) the user picks before the passkey ceremony. Runs pre-session
 * like the rest of Stage 1, so it's rate-limited per IP rather than per user
 * (see startPhoneAuthUnsafe) and re-resolves the profile from the exact
 * (phone, username) pair rather than trusting a client-supplied id, same as
 * every other passkey-adjacent action here. */
async function setProfileCardGradientUnsafe(phone: string, username: string, gradient: "cyan" | "magenta" | "amber" | "emerald"): Promise<SetCardGradientResult> {
  const clientIp = await getClientIp();
  const withinLimit = await checkRateLimit(`set-card-gradient:${clientIp}`, { max: 20, windowSeconds: 300 });
  if (!withinLimit) {
    return { ok: false, message: "Too many attempts. Please wait a few minutes and try again." };
  }

  const admin = createAdminClient();
  const profile = await resolveExactProfile(admin, phone, username);

  if (!profile) {
    return { ok: false, message: "We couldn't find that identity. Please start again." };
  }

  const { error } = await admin.from("profiles").update({ card_gradient: gradient }).eq("id", profile.id);

  if (error) {
    return { ok: false, message: "We couldn't save your card style. Please retry." };
  }

  return { ok: true };
}

export async function setProfileCardGradient(phone: string, username: string, gradient: "cyan" | "magenta" | "amber" | "emerald"): Promise<SetCardGradientResult> {
  try {
    return await setProfileCardGradientUnsafe(phone, username, gradient);
  } catch (error) {
    logger.error("Unhandled error in setProfileCardGradient", error);
    return { ok: false, message: "We couldn't save your card style. Please retry." };
  }
}

type SetAccountTypeResult = { ok: true } | { ok: false; message: string };

/** ProfileBuilderScreen's resident/tourist choice - a visiting tourist has
 * no Tunisian bank/wallet destination to ever receive into, so this is what
 * the rest of the app (home quick actions, the smart scan tab, goReceiveQr)
 * gates the receive side on. Same pre-session, IP-rate-limited,
 * resolveExactProfile pattern as setProfileCardGradient - there is no
 * session yet at this point in the registration flow. */
async function setAccountTypeUnsafe(phone: string, username: string, accountType: "resident" | "tourist"): Promise<SetAccountTypeResult> {
  const clientIp = await getClientIp();
  const withinLimit = await checkRateLimit(`set-account-type:${clientIp}`, { max: 20, windowSeconds: 300 });
  if (!withinLimit) {
    return { ok: false, message: "Too many attempts. Please wait a few minutes and try again." };
  }

  const admin = createAdminClient();
  const profile = await resolveExactProfile(admin, phone, username);

  if (!profile) {
    return { ok: false, message: "We couldn't find that identity. Please start again." };
  }

  const { error } = await admin.from("profiles").update({ account_type: accountType }).eq("id", profile.id);

  if (error) {
    return { ok: false, message: "We couldn't save that. Please retry." };
  }

  return { ok: true };
}

export async function setAccountType(phone: string, username: string, accountType: "resident" | "tourist"): Promise<SetAccountTypeResult> {
  try {
    return await setAccountTypeUnsafe(phone, username, accountType);
  } catch (error) {
    logger.error("Unhandled error in setAccountType", error);
    return { ok: false, message: "We couldn't save that. Please retry." };
  }
}
