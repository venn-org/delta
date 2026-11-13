import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * ⚠️ ADMIN CLIENT — service role, RLS **BYPASSED**.
 *
 * This is the only file in the codebase permitted to read
 * SUPABASE_SERVICE_ROLE_KEY (docs/ARCHITECTURE.md §3.2).
 *
 * Permitted callers — nothing else:
 *   1. Razorpay webhook handler       (no user session exists)
 *   2. Cron route handlers            (match worker, reconciliation, expiry)
 *   3. claimOnboardingSession         (writes rows the new user cannot yet see)
 *   4. Moderation actions             (acts across users by definition)
 *
 * Everywhere else, use lib/supabase/server.ts. An eslint `no-restricted-imports`
 * rule blocks importing this from app/**, and `server-only` makes a bundle into
 * client code a build error rather than a runtime leak.
 */
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not set. The admin client cannot be created.",
    );
  }

  return createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: {
      // There is no user here and nothing to persist or refresh.
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
