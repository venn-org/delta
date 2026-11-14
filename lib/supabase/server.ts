import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/lib/database.types";
import { cookies } from "next/headers";
import { connection } from "next/server";

/**
 * Server client — anon key + the user's session cookie, RLS ENFORCED.
 *
 * The default for Server Components and Server Actions. Reaches exactly the
 * rows the signed-in user is allowed to see, so a forgotten `.eq('user_id',…)`
 * fails closed rather than leaking.
 */
export async function createClient() {
  // Supabase's auth client checks token expiry against the current time, which
  // Cache Components treats as an unstable value during prerender. Marking the
  // read as request-time here means every caller gets that for free, rather
  // than each route having to remember it.
  await connection();

  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component, where cookies are read-only.
            // proxy.ts refreshes the session, so this is safe to swallow.
          }
        },
      },
    },
  );
}
