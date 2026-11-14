import "server-only";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { SESSION_COOKIE } from "./session";

/**
 * Attaching anonymous answers to a real account (§4.3, ADR-004).
 *
 * `claim_onboarding_session` is revoked from anon and authenticated
 * (rls.sql:211) because it writes on behalf of a session the database cannot
 * verify, so it runs through the service role. That keeps the admin client
 * inside this domain: `server/auth/` calls this function rather than reaching
 * for `lib/supabase/admin` itself, per the module rule in §3.1.
 */

export type ClaimOutcome =
  | { ok: true; matches: number }
  | { ok: false; reason: "no_session" | "unclaimable" | "error" };

/**
 * Claims whatever the browser's onboarding cookie points at for `userId`.
 *
 * Idempotent, because the RPC is: it accepts a session already claimed by this
 * same user, upserts answers on conflict and only moves `status` off
 * 'onboarding'. So a double-submitted signup is a no-op rather than a
 * duplicate.
 *
 * The session id comes from the httpOnly cookie and nowhere else — never a
 * form field or a query parameter, or anyone could claim a stranger's answers
 * by guessing a uuid.
 */
export async function claimSession(userId: string): Promise<ClaimOutcome> {
  const jar = await cookies();
  const sessionId = jar.get(SESSION_COOKIE)?.value;
  if (!sessionId) return { ok: false, reason: "no_session" };

  const admin = createAdminClient();
  const { data, error } = await admin.rpc("claim_onboarding_session", {
    p_session_id: sessionId,
    p_user_id: userId,
  });

  if (error) {
    // 'session_unclaimable' means expired, or already claimed by somebody
    // else. The cookie is deliberately LEFT IN PLACE: it is the only pointer
    // to those answers, and dropping it here would discard them for good.
    // `/` sends a user whose status is still 'onboarding' back into the chat,
    // which is what recovery looks like.
    const unclaimable =
      error.message.includes("session_unclaimable") || error.code === "P0001";
    console.error("claim_onboarding_session failed", {
      userId,
      code: error.code,
      message: error.message,
    });
    return { ok: false, reason: unclaimable ? "unclaimable" : "error" };
  }

  // Claimed for good — the cookie has done its job and anonymous state should
  // not linger on a signed-in browser.
  jar.delete(SESSION_COOKIE);
  return { ok: true, matches: data ?? 0 };
}
