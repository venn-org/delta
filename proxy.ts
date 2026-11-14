import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/lib/database.types";

/**
 * Session refresh, and nothing else.
 *
 * In Next 16 `middleware.ts` is deprecated and renamed `proxy.ts`; the
 * published @supabase/ssr recipe is still written for the old name, so this is
 * a port of it rather than a copy.
 *
 * A Supabase access token expires every hour. Server Components can read
 * cookies but not write them, so without something upstream rotating the
 * token, a server read eventually runs with a stale one. This is that
 * something: it calls getUser(), lets the client write any refreshed cookies
 * onto the response, and returns.
 *
 * It does NOT decide who may see what. The Next docs are explicit that proxy
 * "should not be used as a full session management or authorization
 * solution", and this project's authorization boundary is RLS plus what each
 * server read can reach (§3.2, §6.5). Routes guard themselves.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // Onto the request first, so anything downstream in this same pass
          // sees the refreshed token; then onto a fresh response, so the
          // browser is told about it too.
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Must be getUser(), not getSession(): only getUser() revalidates the token
  // with the auth server, and only that triggers a refresh.
  await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: [
    // Everything but static assets and image files — refreshing a token on a
    // favicon request is wasted work on every page load.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico)$).*)",
  ],
};
