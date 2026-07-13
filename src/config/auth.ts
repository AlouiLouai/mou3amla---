import { env } from "@/config/env";

export const DUMMY_PHONE_OTP_ENABLED =
  env.DUMMY_PHONE_OTP_ENABLED ? env.DUMMY_PHONE_OTP_ENABLED === "true" : env.NODE_ENV !== "production";

export const DEMO_OTP_ASSIST_ENABLED = DUMMY_PHONE_OTP_ENABLED;
