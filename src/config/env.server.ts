import "server-only";

import { z } from "zod";
import { env } from "@/config/env";

const serverSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  QR_TOKEN_SECRET: z.string().min(32).optional(),
  DIDIT_API_KEY: z.string().min(1).optional(),
  DIDIT_WORKFLOW_ID: z.string().uuid().optional(),
  DIDIT_WEBHOOK_SECRET: z.string().min(1).optional(),
});

const parsedServer = serverSchema.safeParse({
  NODE_ENV: process.env.NODE_ENV,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  QR_TOKEN_SECRET: process.env.QR_TOKEN_SECRET,
  DIDIT_API_KEY: process.env.DIDIT_API_KEY,
  DIDIT_WORKFLOW_ID: process.env.DIDIT_WORKFLOW_ID,
  DIDIT_WEBHOOK_SECRET: process.env.DIDIT_WEBHOOK_SECRET,
});

if (!parsedServer.success) {
  throw new Error(
    `Invalid server environment variables: ${JSON.stringify(parsedServer.error.flatten().fieldErrors)}`,
  );
}

export const serverEnv = {
  ...env,
  ...parsedServer.data,
};
