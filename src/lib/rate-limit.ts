import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

/**
 * Atomic fixed-window rate limit backed by `public.check_rate_limit` (see
 * supabase/migrations/20260718110000_rate_limits.sql) - no external
 * dependency, and the increment-and-compare happens inside one Postgres
 * function call, so concurrent requests for the same key can't race past it.
 *
 * Fails open: if the check itself errors (e.g. a transient DB issue), the
 * caller proceeds rather than blocking every request behind a broken
 * rate limiter. Rate limiting here is defense in depth, not the primary
 * control.
 */
export async function checkRateLimit(key: string, options: { max: number; windowSeconds: number }): Promise<boolean> {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("check_rate_limit", {
    p_key: key,
    p_max_count: options.max,
    p_window_seconds: options.windowSeconds,
  });

  if (error) {
    logger.error("Rate limit check failed, failing open", error, { key });
    return true;
  }

  return Boolean(data);
}
