"use server";

import { revalidatePath } from "next/cache";
import { validateAnswer } from "@/lib/answers";
import type { AnswerValue } from "@/lib/answers";
import type { FlatDraft } from "@/lib/flat";
import { createClient } from "@/lib/supabase/server";
import { claimSession } from "@/server/onboarding";
import { loadQuestions } from "@/server/onboarding/questions";
import {
  clearSession,
  ensureSession,
  saveAnswer,
  setFlatDraft,
  setRole,
} from "@/server/onboarding/session";

/**
 * Where the chat goes when the last question is answered.
 *
 * Decided on the server, because the answer depends on whether they are
 * already signed in — and the client cannot be trusted to know:
 *
 *  - **Signed out.** The normal path: on to /signin to save the answers.
 *  - **Signed in.** Someone whose claim failed earlier and was sent back to
 *    re-answer. Pushing them to /signin would bounce them to /matches, which
 *    would send them back to the chat, forever. So the claim runs here
 *    instead, which is the thing that was missing in the first place.
 *
 * If the claim fails again the session is dropped, because the only way it
 * fails for a signed-in user with fresh answers is a session already claimed
 * by somebody else — and a cookie pointing at that is worse than no cookie.
 * Starting clean terminates; retrying the same session would not.
 */
export async function finishOnboarding(): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return "/signin";

  const outcome = await claimSession(user.id);
  if (outcome.ok) return "/finding";

  await clearSession();
  return "/onboarding";
}

export type SubmitResult =
  | { ok: true; value: AnswerValue; ack: string | null }
  | { ok: false; error: string };

/**
 * Records one answer against the anonymous session.
 *
 * The answer is re-validated here against `questions.options` — the client's
 * own checks are a convenience, not a guarantee, and this is the only place
 * that decides what gets stored (§7.1).
 */
export async function submitAnswer(
  questionKey: string,
  raw: unknown,
): Promise<SubmitResult> {
  let session;
  try {
    session = await ensureSession();
  } catch (e) {
    const message = e instanceof Error ? e.message : "unknown";
    return {
      ok: false,
      error:
        message === "rate_limited"
          ? "That's a lot of restarts. Give it an hour and try again."
          : "Couldn't start the chat. Try again in a moment.",
    };
  }

  const questions = await loadQuestions();
  const question = questions.find((q) => q.key === questionKey);
  if (!question) {
    return { ok: false, error: "That question no longer exists." };
  }

  const result = validateAnswer(question, raw);
  if (!result.ok) return { ok: false, error: result.error };

  try {
    // `role` both stores an answer and branches the rest of the chat.
    if (question.key === "role" && "choice" in result.value) {
      const choice = result.value.choice;
      if (choice === "seeker" || choice === "haver") {
        await setRole(session.id, choice);
      }
    }

    const answered = Object.keys(session.answers).length;
    await saveAnswer(session.id, question.key, result.value, answered + 1);
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Couldn't save that answer.",
    };
  }

  return { ok: true, value: result.value, ack: question.ack };
}

/** Flat-details step, for the "I have a flat" branch. */
export async function saveFlatDetails(
  draft: FlatDraft,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const session = await ensureSession();
    await setFlatDraft(session.id, draft);
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Couldn't save the flat details.",
    };
  }
}

/**
 * "Start over" on the resume screen.
 *
 * Drops the cookie rather than deleting the row: the old session expires on
 * its own, and keeping it means an abandoned-then-restarted funnel is still
 * measurable.
 */
export async function startOver(): Promise<void> {
  await clearSession();
  revalidatePath("/onboarding/chat");
}
