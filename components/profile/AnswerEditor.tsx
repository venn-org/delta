"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { AnswerInput } from "@/components/chat/AnswerInput";
import type { AnswerValue, Question } from "@/lib/answers";
import type { SaveAnswerResult } from "@/server/profile";

/**
 * One question, opened on the current answer, using the same control the
 * onboarding chat used. Saving goes back to the list once the server has
 * stored the answer and recomputed matches.
 */
export function AnswerEditor({
  question,
  current,
  action,
}: {
  question: Question;
  current: AnswerValue | null;
  action: (key: string, value: AnswerValue) => Promise<SaveAnswerResult>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function save(value: AnswerValue) {
    setError(null);
    startTransition(async () => {
      const result = await action(question.key, value);
      if (result.ok) router.push("/profile/answers");
      else setError(result.error);
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <AnswerInput
        question={question}
        initial={current}
        onAnswer={save}
        disabled={pending}
      />
      <p aria-live="polite" className="min-h-5 text-right text-[13px]">
        {pending ? (
          <span className="text-slate">Saving and refreshing your matches…</span>
        ) : (
          error && (
            <span role="alert" className="text-danger">
              {error}
            </span>
          )
        )}
      </p>
    </div>
  );
}
