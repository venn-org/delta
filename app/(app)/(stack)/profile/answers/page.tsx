import { ListRow } from "@/components/ListRow";
import { SubpageHeader } from "@/components/SubpageHeader";
import { requireStage } from "@/server/auth";
import { getMyAnswers } from "@/server/profile";

/**
 * /profile/answers — every answer the matcher uses (Edit-answers.dc.html).
 * Each row opens that one question; saving it recomputes matches.
 */
export const instant = false;

export default async function AnswersPage() {
  await requireStage("app");
  const answers = await getMyAnswers();

  return (
    <div className="relative min-h-full bg-canvas">
      <SubpageHeader
        backHref="/profile"
        backLabel="Back to profile"
        title="Your answers"
        subtitle="Tap any answer to change it. Matches refresh instantly."
      />
      <ul className="flex flex-col gap-2 px-gutter pt-2 pb-8">
        {answers.map(({ question, label }) => (
          <li key={question.key} className="venn-rise">
            <ListRow
              href={`/profile/answers/${question.key}`}
              title={question.prompt}
              subtitle={label ?? "Not answered yet"}
              className="shadow-card"
            />
          </li>
        ))}
      </ul>
    </div>
  );
}
