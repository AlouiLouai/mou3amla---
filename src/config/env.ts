import { z } from "zod";

const serverSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

const clientSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
  NEXT_PUBLIC_VAPID_PUBLIC_KEY: z.string().optional(),
});

const parsedServer = serverSchema.safeParse({
  NODE_ENV: process.env.NODE_ENV,
});

const parsedClient = clientSchema.safeParse({
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  NEXT_PUBLIC_VAPID_PUBLIC_KEY: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
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
