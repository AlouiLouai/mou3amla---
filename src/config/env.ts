import { z } from "zod";

const serverSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  QR_TOKEN_SECRET: z.string().min(32).optional(),
  DIDIT_API_KEY: z.string().min(1).optional(),
  DIDIT_WORKFLOW_ID: z.string().uuid().optional(),
  DIDIT_WEBHOOK_SECRET: z.string().min(1).optional(),
});

const clientSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
  NEXT_PUBLIC_VAPID_PUBLIC_KEY: z.string().optional(),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
});

const parsedServer = serverSchema.safeParse({
  NODE_ENV: process.env.NODE_ENV,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  QR_TOKEN_SECRET: process.env.QR_TOKEN_SECRET,
  DIDIT_API_KEY: process.env.DIDIT_API_KEY,
  DIDIT_WORKFLOW_ID: process.env.DIDIT_WORKFLOW_ID,
  DIDIT_WEBHOOK_SECRET: process.env.DIDIT_WEBHOOK_SECRET,
});

const parsedClient = clientSchema.safeParse({
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  NEXT_PUBLIC_VAPID_PUBLIC_KEY: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
});

if (!parsedServer.success) {
  throw new Error(
    `Invalid server environment variables: ${JSON.stringify(parsedServer.error.flatten().fieldErrors)}`,
  );
}

if (!parsedClient.success) {
  throw new Error(
    `Invalid client environment variables: ${JSON.stringify(parsedClient.error.flatten().fieldErrors)}`,
  );
}

export const env = {
  ...parsedServer.data,
  ...parsedClient.data,
};
