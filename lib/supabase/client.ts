import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/lib/database.types";

/**
 * Browser client — anon key, RLS ENFORCED.
 *
 * Use in Client Components and for Realtime subscriptions. Every query runs as
 * the signed-in user, so the policies in docs/ARCHITECTURE.md §6.5 apply.
 */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
