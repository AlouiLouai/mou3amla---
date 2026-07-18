import "server-only";

import { z } from "zod";
import { env } from "@/config/env";

const serverSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  QR_TOKEN_SECRET: z.string().min(32).optional(),
});

const parsedServer = serverSchema.safeParse({
  NODE_ENV: process.env.NODE_ENV,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  QR_TOKEN_SECRET: process.env.QR_TOKEN_SECRET,
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
