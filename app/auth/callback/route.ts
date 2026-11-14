import { NextResponse, type NextRequest } from "next/server";
import { completeOAuth } from "@/server/auth";

/**
 * /auth/callback — where Google comes back to.
 *
 * A route handler and not a page, because exchanging the code writes session
 * cookies and a Server Component cannot write cookies.
 *
 * Outside the (app) route group on purpose: it renders no UI, so it has no
 * business inside the phone frame.
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");

  // Google's own refusal (a cancelled consent screen, say) comes back as an
  // error rather than a code.
  const providerError = url.searchParams.get("error_description") ?? url.searchParams.get("error");
  if (providerError) {
    console.error("oauth provider returned an error", { providerError });
    return NextResponse.redirect(new URL("/signin?error=oauth", url.origin));
  }

  if (!code) {
    return NextResponse.redirect(new URL("/signin?error=oauth", url.origin));
  }

  const result = await completeOAuth(code);
  if (!result.ok) {
    return NextResponse.redirect(new URL("/signin?error=oauth", url.origin));
  }

  // Signed in either way. A failed claim means the answers are still behind
  // the onboarding cookie, so send them back to the chat rather than to an
  // empty match list (anti-goal A4).
  return NextResponse.redirect(
    new URL(result.claim.ok ? "/finding" : "/onboarding/chat", url.origin),
  );
}
