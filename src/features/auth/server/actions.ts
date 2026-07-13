"use server";

import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { DEMO_OTP_ASSIST_ENABLED, DUMMY_PHONE_OTP_ENABLED } from "@/config/auth";
import { env } from "@/config/env";
import { buildDisplayName, landingInputSchema, normalizePhoneForAuth, otpInputSchema } from "@/features/auth/lib/identity";
import { clearDemoOtpCookie, setDemoOtpCookie } from "@/features/auth/server/demo-otp";
import type { AuthFormState, VerificationStatus } from "@/features/auth/types";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

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

function buildDemoOtp(phone: string, username: string) {
  const digest = createHash("sha256").update(`${phone}:${username}:squad-demo-otp`).digest("hex");
  const digits = String(parseInt(digest.slice(0, 12), 16) % 1_000_000);
  return digits.padStart(6, "0");
}

function buildDemoBridgePassword(phone: string, username: string) {
  const digest = createHash("sha256")
    .update(`${env.SUPABASE_SERVICE_ROLE_KEY}:${phone}:${username}:squad-demo-password`)
    .digest("hex");
  return `Sqd!${digest.slice(0, 42)}9a`;
}

function buildDemoBridgeEmail(phone: string, username: string) {
  const digits = phone.replace(/\D/g, "");
  const handle = username.replace(/^@+/, "").toLowerCase();
  return `demo-${digits}-${handle}@mou3amla.local`;
}

function encodeVerificationSearch(phone: string, username: string) {
  return new URLSearchParams({
    phone,
    username,
  }).toString();
}

async function findAuthUser(phone: string, email: string) {
  const admin = createAdminClient();

  for (let page = 1; page <= 5; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage: 200,
    });

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

export async function startPhoneAuth(
  _prevState: AuthFormState | undefined,
  formData: FormData,
): Promise<AuthFormState | undefined> {
  const parsed = landingInputSchema.safeParse({
    phone: formData.get("phone"),
    username: formData.get("username"),
  });

  if (!parsed.success) {
    return {
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  const phone = normalizePhoneForAuth(parsed.data.phone);
  const username = parsed.data.username;
  const admin = createAdminClient();

  const lookup = await admin
    .from("profiles")
    .select("id, phone, username, verification_status")
    .or(`phone.eq.${phone},username.eq.${username}`);

  const profiles = (lookup.data ?? null) as ProfileLookup[] | null;
  const lookupError = lookup.error;

  if (lookupError) {
    return {
      message: "We couldn't check your account right now. Please try again.",
    };
  }

  const phoneMatch = profiles?.find((profile) => profile.phone === phone) ?? null;
  const usernameMatch = profiles?.find((profile) => profile.username === username) ?? null;

  if ((phoneMatch && usernameMatch && phoneMatch.id !== usernameMatch.id) || (phoneMatch && !usernameMatch) || (!phoneMatch && usernameMatch)) {
    return {
      message: "That phone number and username don't belong to the same SQUAD identity.",
    };
  }

  let profileId = phoneMatch?.id ?? usernameMatch?.id ?? null;
  const demoOtp = DUMMY_PHONE_OTP_ENABLED ? buildDemoOtp(phone, username) : null;
  const demoBridgePassword = DUMMY_PHONE_OTP_ENABLED ? buildDemoBridgePassword(phone, username) : null;
  const demoBridgeEmail = DUMMY_PHONE_OTP_ENABLED ? buildDemoBridgeEmail(phone, username) : null;

  if (demoOtp) {
    await setDemoOtpCookie({ phone, username, otp: demoOtp });
  } else {
    await clearDemoOtpCookie();
  }

  if (!profileId) {
    const { data: createdUser, error: createUserError } = await admin.auth.admin.createUser({
      ...(demoBridgeEmail ? { email: demoBridgeEmail, email_confirm: true } : {}),
      ...(demoBridgePassword ? { password: demoBridgePassword } : {}),
      user_metadata: {
        preferred_username: username,
        phone,
      },
      app_metadata: {
        onboarding_state: "otp_pending",
        auth_mode: "dummy_phone_otp",
      },
    });

    if (createUserError?.code === "phone_exists" || createUserError?.code === "email_exists") {
      const recovered = await findAuthUser(phone, demoBridgeEmail ?? "");

      if (recovered.error || !recovered.user) {
        return {
          message: "That phone already exists in auth, but we couldn't recover it safely yet. Please retry once.",
        };
      }

      const existingPreferredUsername = recovered.user.user_metadata?.preferred_username?.replace(/^@+/, "").toLowerCase();
      if (existingPreferredUsername && existingPreferredUsername !== username) {
        return {
          message: "That phone number is already attached to a different SQUAD handle.",
        };
      }

      profileId = recovered.user.id;
    } else if (createUserError || !createdUser.user) {
      return {
        message: "We couldn't create your account yet. Please try again.",
      };
    } else {
      profileId = createdUser.user.id;
    }

    const { error: insertProfileError } = await admin.from("profiles").insert({
      id: profileId,
      phone,
      username,
      display_name: buildDisplayName(username),
      verification_status: "unverified",
      didit_latest_status: null,
      didit_session_id: null,
    });

    if (insertProfileError) {
      if (insertProfileError.code === "23505") {
        return {
          message: "That SQUAD handle is already taken. Try another username.",
        };
      }

      return {
        message: "We created your auth record, but couldn't finish profile setup. Please retry.",
      };
    }
  }

  if (profileId && demoBridgePassword && demoBridgeEmail) {
    const { error: demoBridgeError } = await admin.auth.admin.updateUserById(profileId, {
      email: demoBridgeEmail,
      email_confirm: true,
      password: demoBridgePassword,
      user_metadata: {
        preferred_username: username,
        phone,
      },
    });

    if (demoBridgeError) {
      return {
        message: "We couldn't prepare the demo sign-in bridge. Please retry once.",
      };
    }
  }

  redirect(`/verify?${encodeVerificationSearch(phone, username)}`);
}

export async function verifyPhoneOtp(
  phone: string,
  username: string,
  expectedDemoOtp: string | null,
  _prevState: AuthFormState | undefined,
  formData: FormData,
): Promise<AuthFormState | undefined> {
  const parsed = otpInputSchema.safeParse({
    otp: formData.get("otp"),
  });

  if (!parsed.success) {
    return {
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  const isDemoMatch = DEMO_OTP_ASSIST_ENABLED && expectedDemoOtp && parsed.data.otp === expectedDemoOtp;
  if (!DUMMY_PHONE_OTP_ENABLED) {
    return {
      message: "Dummy OTP is disabled in this environment. Configure a real SMS OTP rail or re-enable the demo bridge.",
    };
  }

  if (!isDemoMatch) {
    return {
      message: "That code didn't match. Please try the latest 6-digit code.",
    };
  }

  const supabase = await createClient();
  const authResult = await supabase.auth.signInWithPassword({
    email: buildDemoBridgeEmail(phone, username),
    password: buildDemoBridgePassword(phone, username),
  });

  const data = authResult.data;
  const error = authResult.error;

  if (error || !data.user) {
    return {
      message: "The code matched, but we couldn't open your secure session. Please retry once.",
    };
  }

  const admin = createAdminClient();
  const { error: updateError } = await admin
    .from("profiles")
    .update({
      display_name: buildDisplayName(username),
    })
    .eq("id", data.user.id)
    .eq("phone", phone)
    .eq("username", username);

  if (updateError) {
    return {
      message: "Your session is valid, but we couldn't sync your profile. Please retry once.",
    };
  }

  await clearDemoOtpCookie();
  revalidatePath("/home");
  redirect("/home");
}
