import { ChatFlow } from "@/components/chat/ChatFlow";
import { loadQuestions, questionsForRole } from "@/server/onboarding/questions";
import { getSession } from "@/server/onboarding/session";

// The chat reads a per-browser cookie and live question data, so it is
// rendered per request rather than prerendered.
export const dynamic = "force-dynamic";

/**
 * /app/chat — the onboarding chat.
 *
 * Questions come from the database, and answers are written against an
 * anonymous session keyed by an httpOnly cookie. Nobody has signed up yet:
 * this whole screen runs as `anon` (§4.3, ADR-004).
 */
export default async function ChatPage() {
  const [all, session] = await Promise.all([loadQuestions(), getSession()]);

  const questions = questionsForRole(all, session?.role ?? null);
  // `role` is answered first and unlocks the rest, so before it is answered
  // only that one question is visible. Once answered, show the full set.
  const visible = session?.role ? questions : all;

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
