import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSession } from "@/server/onboarding/session";
import { loadQuestions } from "@/server/onboarding/questions";

/**
 * / — the entry router.
 *
 * The marketing site lives in its own project on the apex domain; this app is
 * everything behind it. So `/` holds no content of its own, it just works out
 * where someone belongs:
 *
 *   signed in                  → their matches
 *   finished the chat, no account → save your answers
 *   mid-chat                   → resume where they left off
 *   never started              → the intro
 *
 * Reads the session cookie, so it blocks on the server rather than
 * prerendering (see the Cache Components notes on /app/chat).
 */
export const instant = false;

export default async function Index() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    // Built in phase 4; until then this is the intended destination, not a
    // reachable one, since nothing signs a user in yet.
    redirect("/app/matches");
  }

  const session = await getSession();
  const answered = session ? Object.keys(session.answers).length : 0;

  if (answered === 0) redirect("/app");

  const questions = await loadQuestions();
  redirect(answered >= questions.length ? "/app/signup" : "/app/chat");
}
