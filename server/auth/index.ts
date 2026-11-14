import "server-only";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { claimSession } from "@/server/onboarding";
import type { ClaimOutcome } from "@/server/onboarding";
import {
  clearPendingSignIn,
  getPendingSignIn,
  setPendingSignIn,
} from "./pending";

/**
 * The auth domain's public interface (§3.1).
 *
 * Two independent sign-in paths on purpose (ADR-008): if email delivery
 * breaks, Google still gets people in. Phone is deferred — it stays a
 * nullable column on `private_contacts` and a method on the Verify screen.
 *
 * Authorization is NOT decided here or in proxy.ts. It lives in RLS and in
 * what each server read can reach (§3.2, §6.5); these functions only
 * establish who someone is.
 */

export { getPendingSignIn, clearPendingSignIn } from "./pending";
export type { PendingSignIn } from "./pending";

/** Where OAuth comes back to. Derived from the request, never hardcoded. */
async function origin(): Promise<string> {
  const h = await headers();
  const forwardedHost = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "http";
  return `${proto}://${forwardedHost}`;
}

export type SendCodeResult =
  | { ok: true }
  | { ok: false; error: string };

/**
 * Sends a six-digit code to `email` and remembers who it went to.
 *
 * `full_name` is passed as user metadata because `handle_new_user()` reads
 * `raw_user_meta_data` to populate `profiles.display_name`. Without it an
 * email user would land with an empty display name while a Google user gets
 * theirs — the trigger has no other source for it.
 */
export async function sendEmailCode(
  email: string,
  firstName: string,
): Promise<SendCodeResult> {
  const supabase = await createClient();
  const address = email.trim().toLowerCase();
  const name = firstName.trim();

  const { error } = await supabase.auth.signInWithOtp({
    email: address,
    options: {
      shouldCreateUser: true,
      data: { full_name: name },
    },
  });

  if (error) {
    console.error("signInWithOtp failed", { code: error.code, message: error.message });
    if (error.status === 429) {
      return {
        ok: false,
        error: "That's a few codes already. Give it a minute and try again.",
      };
    }
    return { ok: false, error: "Couldn't send the code. Try again in a moment." };
  }

  await setPendingSignIn({ email: address, firstName: name });
  return { ok: true };
}

export type VerifyResult =
  | { ok: true; claim: ClaimOutcome }
  | { ok: false; error: string };

/**
 * Exchanges a code for a session, then attaches the anonymous answers.
 *
 * The claim's outcome is handed back rather than thrown on: someone whose
 * session expired mid-signup is still legitimately signed in, and the caller
 * decides where to send them (they go back to the chat, never to an empty
 * match list).
 */
export async function verifyEmailCode(
  email: string,
  code: string,
): Promise<VerifyResult> {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.verifyOtp({
    email: email.trim().toLowerCase(),
    token: code.trim(),
    type: "email",
  });

  if (error || !data.user) {
    console.error("verifyOtp failed", { code: error?.code, message: error?.message });
    return {
      ok: false,
      error:
        error?.status === 403 || error?.code === "otp_expired"
          ? "That code has expired. Ask for a new one."
          : "That code isn't right. Check it and try again.",
    };
  }

  await clearPendingSignIn();
  return { ok: true, claim: await claimSession(data.user.id) };
}

/**
 * Starts Google sign-in and returns the URL to send the browser to.
 *
 * PKCE, so the code that comes back to /auth/callback is only redeemable by
 * this browser. The exchange happens there, in a route handler, because it
 * writes session cookies.
 */
export async function startGoogleOAuth(): Promise<
  { ok: true; url: string } | { ok: false; error: string }
> {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${await origin()}/auth/callback`,
    },
  });

  if (error || !data.url) {
    console.error("signInWithOAuth failed", { message: error?.message });
    return { ok: false, error: "Couldn't reach Google. Try again in a moment." };
  }
  return { ok: true, url: data.url };
}

/** Finishes Google sign-in: redeem the code, then claim the answers. */
export async function completeOAuth(
  code: string,
): Promise<{ ok: true; claim: ClaimOutcome } | { ok: false; error: string }> {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.user) {
    console.error("exchangeCodeForSession failed", { message: error?.message });
    return { ok: false, error: "Google sign-in didn't complete. Try again." };
  }

  return { ok: true, claim: await claimSession(data.user.id) };
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
}
