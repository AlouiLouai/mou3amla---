import { z } from "zod";

const clientSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
  // Optional: unset in dev/most environments, and PostHog itself no-ops
  // client-side when NEXT_PUBLIC_POSTHOG_KEY is absent - see
  // src/components/analytics/posthog-provider.tsx.
  NEXT_PUBLIC_POSTHOG_KEY: z.string().min(1).optional(),
  NEXT_PUBLIC_POSTHOG_HOST: z.string().url().optional(),
});

const parsedClient = clientSchema.safeParse({
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  NEXT_PUBLIC_POSTHOG_KEY: process.env.NEXT_PUBLIC_POSTHOG_KEY,
  NEXT_PUBLIC_POSTHOG_HOST: process.env.NEXT_PUBLIC_POSTHOG_HOST,
});

if (!parsedClient.success) {
  throw new Error(
    `Invalid client environment variables: ${JSON.stringify(parsedClient.error.flatten().fieldErrors)}`,
  );
}

/**
 * Client-safe env only — NEXT_PUBLIC_* vars, importable from "use client" files.
 * Server secrets live in `@/config/env.server` (guarded by the `server-only` package)
 * so they can never be pulled into a browser bundle.
 */
export const env = parsedClient.data;
