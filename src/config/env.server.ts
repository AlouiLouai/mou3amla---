import "server-only";

import { z } from "zod";
import { env } from "@/config/env";

const serverSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  QR_TOKEN_SECRET: z.string().min(32).optional(),
  KONNECT_API_KEY: z.string().min(1).optional(),
  KONNECT_RECEIVER_WALLET_ID: z.string().min(1).optional(),
  KONNECT_API_BASE_URL: z.string().url().optional(),
  FLOUCI_PUBLIC_KEY: z.string().min(1).optional(),
  FLOUCI_PRIVATE_KEY: z.string().min(1).optional(),
  FLOUCI_API_BASE_URL: z.string().url().optional(),
});

const parsedServer = serverSchema.safeParse({
  NODE_ENV: process.env.NODE_ENV,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  QR_TOKEN_SECRET: process.env.QR_TOKEN_SECRET,
  KONNECT_API_KEY: process.env.KONNECT_API_KEY,
  KONNECT_RECEIVER_WALLET_ID: process.env.KONNECT_RECEIVER_WALLET_ID,
  KONNECT_API_BASE_URL: process.env.KONNECT_API_BASE_URL,
  FLOUCI_PUBLIC_KEY: process.env.FLOUCI_PUBLIC_KEY,
  FLOUCI_PRIVATE_KEY: process.env.FLOUCI_PRIVATE_KEY,
  FLOUCI_API_BASE_URL: process.env.FLOUCI_API_BASE_URL,
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
