import { env } from "@/config/env";

export const DIDIT_KYC_WORKFLOW_ID = env.DIDIT_WORKFLOW_ID ?? "d775e387-b3b8-4c5a-93a2-0641a55679f6";

export const DIDIT_CALLBACK_PATH = "/verify-identity/return";
export const DIDIT_WEBHOOK_PATH = "/api/didit/webhook";
