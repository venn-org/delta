import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSession } from "@/server/onboarding/session";
import { loadQuestions } from "@/server/onboarding/questions";

/**
 * / — the entry router.
 *
 * The marketing site lives in its own project on the apex domain and links
 * people straight to /onboarding, so this screen holds no content of its own.
 * It only works out where someone belongs:
 *
 *   signed in, answers claimed       → their matches
 *   signed in, nothing claimed yet   → back into the chat to answer
 *   finished the chat, no account    → sign in, so the answers get saved
 *   mid-chat                         → resume where they left off
 *   a session with nothing in it     → the intro
 *   no cookies at all                → sign in
 *
 * That last rule treats a cold visitor to the bare domain as a returning user
 * who lost their session, not as a new one — new arrivals come from marketing
 * and land on /onboarding directly. /signin therefore has to offer a way into
 * the chat, or someone who simply guessed the domain dead-ends.
 *
 * Reads the session cookie, so it blocks on the server rather than
 * prerendering (see the Cache Components notes on /onboarding/chat).
 */
export const instant = false;

export default async function Index() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    // `status` only leaves 'onboarding' when claim_onboarding_session() runs,
    // so this is how someone whose claim failed gets another go at it instead
    // of being parked on an empty match list.
    const { data: profile } = await supabase
      .from("profiles")
      .select("status")
      .eq("id", user.id)
      .single();

    redirect(profile?.status === "onboarding" ? "/onboarding/chat" : "/matches");
  }

  const session = await getSession();
  if (!session) redirect("/signin");

  const answered = Object.keys(session.answers).length;
  if (answered === 0) redirect("/onboarding");

  const questions = await loadQuestions();
  redirect(answered >= questions.length ? "/signin" : "/onboarding/chat");
}
