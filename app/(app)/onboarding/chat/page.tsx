import { ChatFlow } from "@/components/chat/ChatFlow";
import { loadQuestions, questionsForRole } from "@/server/onboarding/questions";
import { getSession } from "@/server/onboarding/session";

/**
 * /app/chat — the onboarding chat.
 *
 * Questions come from the database, and answers are written against an
 * anonymous session keyed by an httpOnly cookie. Nobody has signed up yet:
 * this whole screen runs as `anon` (§4.3, ADR-004).
 *
 * Cache Components notes, both learned the hard way:
 *  - `export const dynamic` is rejected outright in this setup.
 *  - The chat cannot render anything useful until the cookie is read, so
 *    there is no static shell worth prefetching. `instant = false` lets the
 *    segment block on the server, which is the documented path for
 *    session-reading routes. Wrapping the read in <Suspense> instead left
 *    the streamed subtree rendered but never hydrated.
 */
export const instant = false;

export default async function ChatPage() {
  const [all, session] = await Promise.all([loadQuestions(), getSession()]);

  // `role` is answered first and unlocks the rest, so before it is answered
  // only that one question is visible.
  const visible = session?.role ? questionsForRole(all, session.role) : all;
  const areaQuestion = all.find((q) => q.answerKind === "area_multi");

  return (
    <ChatFlow
      questions={visible}
      areas={areaQuestion?.options ?? []}
      initialAnswers={session?.answers ?? {}}
      initialRole={session?.role ?? null}
    />
  );
}
