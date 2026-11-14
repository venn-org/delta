import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Route guards.
 *
 * These are a redirect convenience, NOT the authorization boundary — that is
 * RLS and what each server read can reach (§3.2, §6.5). Their job is to stop
 * someone being shown a screen that makes no sense for them, not to protect
 * data. Deliberately not in proxy.ts (anti-goal A1).
 */

/** Signed out → /signin. Returns the user id for the caller's reads. */
export async function requireUser(): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/signin");
  return user.id;
}

/**
 * Keeps the onboarding screens for people who still owe answers.
 *
 * A signed-out visitor passes straight through — the chat is anonymous by
 * design. A signed-in user passes only while `profiles.status` is still
 * 'onboarding', which happens when a claim failed and their answers are
 * stranded behind the cookie. Everyone else is sent on to the app.
 */
export async function requireUnclaimed(): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { data: profile } = await supabase
    .from("profiles")
    .select("status")
    .eq("id", user.id)
    .single();

  if (profile?.status !== "onboarding") redirect("/matches");
}
