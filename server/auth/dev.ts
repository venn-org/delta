import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/**
 * ⚠️ DEV-ONLY SIGN-IN — bypasses the real auth flow entirely.
 *
 * A fixed dummy account so the app can be walked without going near email
 * codes or Google. It is the one thing in this codebase that would be a
 * critical vulnerability if it ever reached production, so it is gated twice
 * and fails closed:
 *
 *   1. `NODE_ENV !== "production"`, which Next sets at build time, and
 *   2. `ENABLE_DEV_LOGIN=true`, which has to be set deliberately.
 *
 * Both must hold. A production build cannot satisfy the first no matter what
 * is in the environment, and a non-production build still does nothing
 * without the second. The route that calls this returns a 404 when either
 * fails, so it does not announce its own existence.
 *
 * It uses a real password sign-in rather than forging a session, so the
 * cookies, the proxy refresh and RLS all behave exactly as they do for a real
 * user. The only thing skipped is proving who you are.
 */

const DEV_EMAIL = "dev@vennflat.test";
// Local-only, for an account that exists solely on a developer's machine.
const DEV_PASSWORD = "venn-dev-password";
const DEV_NAME = "Dev Tester";

export function devLoginEnabled(): boolean {
  return (
    process.env.NODE_ENV !== "production" &&
    process.env.ENABLE_DEV_LOGIN === "true"
  );
}

export type DevState = "active" | "onboarding";

/**
 * Signs in as the dummy user, creating the account on first use.
 *
 * `state` picks where in the routing cycle they land:
 *   - "active"      — finished onboarding, goes to the app
 *   - "onboarding"  — signed in but nothing claimed, goes back to the chat
 *
 * The second is there because that branch is otherwise awkward to reach on
 * purpose: it normally only happens when a claim fails.
 */
export async function signInAsDevUser(
  state: DevState = "active",
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!devLoginEnabled()) return { ok: false, error: "disabled" };

  const admin = createAdminClient();

  // Create on first use. A duplicate is fine and expected on every run after
  // the first, so it is not an error.
  const { error: createError } = await admin.auth.admin.createUser({
    email: DEV_EMAIL,
    password: DEV_PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: DEV_NAME },
  });
  if (
    createError &&
    !/already|registered|exists/i.test(createError.message ?? "")
  ) {
    return { ok: false, error: createError.message };
  }

  // Sign in first, so the profile update below targets the id the session is
  // actually for — looking the row up by display name would pick the wrong
  // person the moment anything else is called "Dev Tester".
  const supabase = await createClient();
  const { data: signedIn, error } = await supabase.auth.signInWithPassword({
    email: DEV_EMAIL,
    password: DEV_PASSWORD,
  });
  if (error || !signedIn.user) {
    return { ok: false, error: error?.message ?? "no user" };
  }

  // handle_new_user() already created the profile row; this puts it in the
  // state the caller asked for. `status` is what the routing cycle reads.
  await admin
    .from("profiles")
    .update({ display_name: DEV_NAME, role: "seeker", status: state })
    .eq("id", signedIn.user.id);

  return { ok: true };
}

/** Signs the dummy user out again, so the signed-out paths can be walked. */
export async function devSignOut(): Promise<void> {
  if (!devLoginEnabled()) return;
  const supabase = await createClient();
  await supabase.auth.signOut();
}
