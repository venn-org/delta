import { notFound } from "next/navigation";
import { SubpageHeader } from "@/components/SubpageHeader";
import { AnswerEditor } from "@/components/profile/AnswerEditor";
import { requireStage } from "@/server/auth";
import { getMyAnswer } from "@/server/profile";
import { saveAnswerAction } from "../../actions";

/** /profile/answers/[key] — change one answer. */
export const instant = false;

export default async function EditAnswerPage({
  params,
}: PageProps<"/profile/answers/[key]">) {
  await requireStage("app");
  const { key } = await params;

  // Only questions this user was asked, minus `role`, resolve here.
  const answer = await getMyAnswer(key);
  if (!answer) notFound();

  return (
    <div className="relative min-h-full bg-canvas">
      <SubpageHeader
        backHref="/profile/answers"
        backLabel="Back to your answers"
        title={answer.question.prompt}
        subtitle={answer.question.helper ?? undefined}
      />
      <div className="px-gutter pt-4 pb-8">
        <AnswerEditor
          question={answer.question}
          current={answer.value}
          action={saveAnswerAction}
        />
      </div>
    </div>
  );
}
