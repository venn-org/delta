import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSession, loadQuestions } from "@/server/onboarding";

/**
 * Where does this person belong?
 *
 * One function answers that, and every route defers to it. The alternative —
 * each screen deciding for itself — is how you get two routes that each
 * redirect to the other.
 *
 * These are a redirect convenience, NOT the authorization boundary. That is
 * RLS and what each server read can reach (§3.2, §6.5), and it stays out of
 * proxy.ts (anti-goal A1).
 */

/**
 * A stage, not a path, and that distinction is load-bearing.
 *
 * The onboarding stage covers two screens — the intro and the chat — and
 * someone in that stage may legitimately be on either. Resolving to a single
 * path instead would mean a visitor with no answers resolves to /onboarding,
 * so /onboarding/chat bounces them back to the intro and the chat can never
 * be reached at all.
 */
export type Stage = "app" | "onboarding" | "signin";

export interface Position {
  stage: Stage;
  /** Where to send someone who is in this stage but on the wrong screen. */
  path: string;
}

/**
 * The whole routing cycle, in order. Each rule is mutually exclusive, so
 * there is exactly one answer for any given person.
 *
 *   signed in, answers claimed        → the app
 *   signed in, nothing claimed yet    → finish the questions
 *   signed out, all questions done    → sign in, to save them
 *   signed out, part way through      → resume the chat
 *   signed out, nothing at all        → the intro, the front door
 *
 * The last rule is the important one: somebody who has not done the questions
 * is never sent to a sign-in form. There is nothing to sign in to yet and
 * nothing to save, so they do the chat first.
 *
 * Someone who DOES already have an account reaches the form through the
 * "Already have an account?" link, which carries `?returning=1` and skips
 * this. Without that escape hatch, the last rule would lock existing users
 * out of their own accounts.
 */
export async function resolvePosition(): Promise<Position> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const session = await getSession();
  const answered = session ? Object.keys(session.answers).length : 0;
  const resumePath = answered > 0 ? "/onboarding/chat" : "/onboarding";

  if (user) {
    // `status` only leaves 'onboarding' when claim_onboarding_session runs,
    // so it is the authoritative "has this person finished?" flag.
    const { data: profile } = await supabase
      .from("profiles")
      .select("status")
      .eq("id", user.id)
      .single();

    // No row, or a read that failed, means onboarding — not the app. The
    // trigger creates the profile at signup so this should be unreachable,
    // but the two failure directions are not equally bad: sending a confused
    // user back through the questions costs them a minute, while letting one
    // through to the app on a failed read is the mistake this function
    // exists to prevent.
    if (!profile) {
      return { stage: "onboarding", path: resumePath };
    }

    if (profile.status !== "onboarding") {
      return { stage: "app", path: "/matches" };
    }
    return { stage: "onboarding", path: resumePath };
  }

  if (answered === 0) return { stage: "onboarding", path: "/onboarding" };

  const questions = await loadQuestions();
  if (answered >= questions.length) {
    return { stage: "signin", path: "/signin" };
  }
  return { stage: "onboarding", path: "/onboarding/chat" };
}

/**
 * Sends someone away unless they are already in the right stage.
 *
 * Comparing stages rather than paths is what makes this loop-free: a route
 * never redirects to a screen that would redirect back, because both screens
 * in a stage accept anyone in that stage.
 */
export async function requireStage(here: Stage): Promise<void> {
  const position = await resolvePosition();
  if (position.stage !== here) redirect(position.path);
}

/**
 * Deliberately no `requireUser()`.
 *
 * "Is somebody signed in?" is a weaker question than "does this person belong
 * on this screen?", and the two come apart exactly where it matters: a user
 * whose answers were never claimed is signed in but has no business on a
 * match list. Routes use requireStage(), and read the user from their own
 * Supabase client when they need the id.
 */
