import "server-only";
import { createClient } from "@/lib/supabase/server";
import {
  answerSchemas,
  describeAnswer,
  validateAnswer,
  type AnswerValue,
  type Question,
} from "@/lib/answers";
import { loadQuestions, questionsForRole } from "@/server/onboarding";

/**
 * The user's own answers, for /profile/answers (Edit-answers.dc.html).
 *
 * Questions come from the same loader the onboarding chat uses, filtered by
 * the user's role, so the edit screen asks exactly what the chat asked. `role`
 * itself is left out: changing it changes which questions apply at all, and
 * `save_answer` refuses it.
 */
export interface MyAnswer {
  question: Question;
  value: AnswerValue | null;
  /** Display label, e.g. "Night owl" or "₹18–22k". Null when unanswered. */
  label: string | null;
}

function parse(question: Question, raw: unknown): AnswerValue | null {
  if (raw == null) return null;
  const parsed = answerSchemas[question.answerKind].safeParse(raw);
  return parsed.success ? (parsed.data as AnswerValue) : null;
}

export async function getMyAnswers(): Promise<MyAnswer[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const [questions, { data: profile }, { data: rows }] = await Promise.all([
    loadQuestions(),
    supabase.from("profiles").select("role").eq("id", user.id).single(),
    supabase.from("answers").select("question_key, value").eq("user_id", user.id),
  ]);

  const byKey = new Map((rows ?? []).map((r) => [r.question_key, r.value]));

  return questionsForRole(questions, profile?.role ?? null)
    .filter((q) => q.key !== "role")
    .map((question) => {
      const value = parse(question, byKey.get(question.key));
      return {
        question,
        value,
        label: value ? describeAnswer(question, value) || null : null,
      };
    });
}

export async function getMyAnswer(key: string): Promise<MyAnswer | null> {
  const all = await getMyAnswers();
  return all.find((a) => a.question.key === key) ?? null;
}

export type SaveAnswerResult = { ok: true } | { ok: false; error: string };

/**
 * Changes one answer and refreshes the user's matches.
 *
 * The value is validated here against `questions.options` — the only check on
 * its shape — and `save_answer` then re-derives the caller, refuses `role`,
 * rate-limits, and recomputes matches in the same transaction.
 */
export async function saveMyAnswer(
  key: string,
  raw: unknown,
): Promise<SaveAnswerResult> {
  const mine = await getMyAnswer(key);
  if (!mine) return { ok: false, error: "That question can't be changed here." };

  const checked = validateAnswer(mine.question, raw);
  if (!checked.ok) return { ok: false, error: checked.error };

  const supabase = await createClient();
  const { error } = await supabase.rpc("save_answer", {
    p_key: key,
    p_value: checked.value,
  });
  if (!error) return { ok: true };

  switch (error.code) {
    case "P0004":
      return { ok: false, error: "That's a lot of changes. Give it an hour and try again." };
    case "P0007":
      return { ok: false, error: "That question can't be changed here." };
    case "42501":
      return { ok: false, error: "Your session ended. Sign in again." };
    default:
      console.error("save_answer", { code: error.code, message: error.message });
      return { ok: false, error: "Couldn't save that. Try again." };
  }
}
