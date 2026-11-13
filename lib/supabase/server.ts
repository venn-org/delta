import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Server client — anon key + the user's session cookie, RLS ENFORCED.
 *
 * The default for Server Components and Server Actions. Reaches exactly the
 * rows the signed-in user is allowed to see, so a forgotten `.eq('user_id',…)`
 * fails closed rather than leaking.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
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
            // Middleware refreshes the session, so this is safe to swallow.
          }
        },
      },
    },
  );
}
