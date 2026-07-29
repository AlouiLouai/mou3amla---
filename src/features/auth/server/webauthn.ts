import "server-only";

import { headers } from "next/headers";
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from "@simplewebauthn/server";
import type {
  AuthenticationResponseJSON,
  AuthenticatorTransportFuture,
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
  RegistrationResponseJSON,
} from "@simplewebauthn/server";
import { serverEnv } from "@/config/env.server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

const RP_NAME = "Mou3amla";

type PasskeyCredentialRow = {
  credential_id: string;
  transports: string[] | null;
};

type PasskeyVerificationRow = {
  credential_id: string;
  public_key: string;
  counter: number;
  transports: string[] | null;
};

/** Derived from `NEXT_PUBLIC_APP_URL`, not a Supabase Dashboard toggle - self-hosted so it's fully in our control. */
function getConfiguredRpConfig() {
  const url = new URL(serverEnv.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000");
  return { rpID: url.hostname, origin: url.origin };
}

function isLoopbackHost(hostname: string) {
  return hostname === "localhost" || hostname === "127.0.0.1";
}

async function getRpConfig() {
  const configured = getConfiguredRpConfig();
  const expectedOrigins = new Set<string>([configured.origin]);

  if (serverEnv.NODE_ENV !== "production" && isLoopbackHost(configured.rpID)) {
    const requestOrigin = (await headers()).get("origin");

    if (requestOrigin) {
      try {
        const requestUrl = new URL(requestOrigin);
        if (requestUrl.hostname === configured.rpID || isLoopbackHost(requestUrl.hostname)) {
          expectedOrigins.add(requestUrl.origin);
        }
      } catch {
        // Ignore malformed Origin headers and keep the configured fallback.
      }
    }
  }

  return {
    rpID: configured.rpID,
    origin: configured.origin,
    expectedOrigins: Array.from(expectedOrigins),
  };
}

async function listCredentialDescriptors(userId: string) {
  const admin = createAdminClient();
  const { data } = await admin.from("passkeys").select("credential_id, transports").eq("user_id", userId);

  return ((data ?? []) as PasskeyCredentialRow[]).map((row) => ({
    id: row.credential_id,
    transports: (row.transports ?? undefined) as AuthenticatorTransportFuture[] | undefined,
  }));
}

export async function hasPasskey(userId: string): Promise<boolean> {
  const admin = createAdminClient();
  const { count } = await admin.from("passkeys").select("id", { count: "exact", head: true }).eq("user_id", userId);
  return (count ?? 0) > 0;
}

export async function buildRegistrationOptions(userId: string, username: string): Promise<PublicKeyCredentialCreationOptionsJSON> {
  const { rpID } = await getRpConfig();
  const excludeCredentials = await listCredentialDescriptors(userId);

  return generateRegistrationOptions({
    rpName: RP_NAME,
    rpID,
    userID: new TextEncoder().encode(userId),
    userName: username,
    attestationType: "none",
    excludeCredentials,
    authenticatorSelection: {
      residentKey: "preferred",
      // Must match verifyRegistrationResponse's default `requireUserVerification: true`,
      // and is what a banking app wants anyway (BCT circular 2020-11).
      userVerification: "required",
    },
  });
}

export async function verifyRegistration(
  userId: string,
  challenge: string,
  response: RegistrationResponseJSON,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const { rpID, origin, expectedOrigins } = await getRpConfig();

  let verification;
  try {
    verification = await verifyRegistrationResponse({
      response,
      expectedChallenge: challenge,
      expectedOrigin: expectedOrigins,
      expectedRPID: rpID,
    });
  } catch (error) {
    logger.error("verifyRegistrationResponse threw", error, { userId, rpID, origin, expectedOrigins });
    return { ok: false, message: "We couldn't verify that passkey. Please try again." };
  }

  if (!verification.verified || !verification.registrationInfo) {
    logger.warn("Passkey registration not verified", { userId, rpID, origin, expectedOrigins });
    return { ok: false, message: "We couldn't verify that passkey. Please try again." };
  }

  const { credential, credentialDeviceType, credentialBackedUp } = verification.registrationInfo;
  const admin = createAdminClient();

  const { error } = await admin.from("passkeys").insert({
    user_id: userId,
    credential_id: credential.id,
    public_key: Buffer.from(credential.publicKey).toString("base64"),
    counter: credential.counter,
    transports: credential.transports ?? null,
    device_type: credentialDeviceType,
    backed_up: credentialBackedUp,
  });

  if (error) {
    logger.error("Failed to store new passkey credential", error, { userId });
    return { ok: false, message: "We couldn't save that passkey. Please retry." };
  }

  return { ok: true };
}

export async function buildAuthenticationOptions(userId: string): Promise<PublicKeyCredentialRequestOptionsJSON | null> {
  const { rpID } = await getRpConfig();
  const allowCredentials = await listCredentialDescriptors(userId);

  if (allowCredentials.length === 0) {
    return null;
  }

  return generateAuthenticationOptions({
    rpID,
    allowCredentials,
    userVerification: "required",
  });
}

export async function verifyAuthentication(
  userId: string,
  challenge: string,
  response: AuthenticationResponseJSON,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const { rpID, origin, expectedOrigins } = await getRpConfig();
  const admin = createAdminClient();

  const { data: passkey, error: lookupError } = await admin
    .from("passkeys")
    .select("credential_id, public_key, counter, transports")
    .eq("user_id", userId)
    .eq("credential_id", response.id)
    .maybeSingle<PasskeyVerificationRow>();

  if (lookupError || !passkey) {
    logger.warn("Passkey authentication: no matching credential row", { userId, credentialId: response.id, lookupError });
    return { ok: false, message: "We couldn't find that passkey for this account." };
  }

  let verification;
  try {
    verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge: challenge,
      expectedOrigin: expectedOrigins,
      expectedRPID: rpID,
      credential: {
        id: passkey.credential_id,
        publicKey: new Uint8Array(Buffer.from(passkey.public_key, "base64")),
        counter: passkey.counter,
        transports: (passkey.transports ?? undefined) as AuthenticatorTransportFuture[] | undefined,
      },
    });
  } catch (error) {
    logger.error("verifyAuthenticationResponse threw", error, { userId, rpID, origin, expectedOrigins });
    return { ok: false, message: "We couldn't verify that passkey. Please try again." };
  }

  if (!verification.verified) {
    logger.warn("Passkey authentication not verified", { userId, rpID, origin, expectedOrigins });
    return { ok: false, message: "We couldn't verify that passkey. Please try again." };
  }

  await admin
    .from("passkeys")
    .update({ counter: verification.authenticationInfo.newCounter, last_used_at: new Date().toISOString() })
    .eq("credential_id", passkey.credential_id);

  return { ok: true };
}
