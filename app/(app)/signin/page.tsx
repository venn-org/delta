import { redirect } from "next/navigation";
import { SignInForm } from "@/components/auth/SignInForm";
import { createClient } from "@/lib/supabase/server";
import { requireStage } from "@/server/auth";
import { getSession, loadQuestions } from "@/server/onboarding";

/**
 * /signin — Signup.dc.html.
 *
 * Two ways in, and they are not the same thing:
 *
 *  - **Finishing the chat.** The normal path. Answers already exist against
 *    the anonymous session and get attached once they authenticate (§4.3,
 *    ADR-004). resolvePosition() sends them here only when every question
 *    is answered, so the screen always has something to save.
 *
 *  - **`?returning=1`.** Someone who already has an account, arriving from
 *    the "Already have an account?" link. They have no onboarding session and
 *    nothing to claim, and that is fine — they are signing in, not signing
 *    up.
 *
 * Anyone else is sent to do the questions first. There is no point showing a
 * sign-in form to somebody with no account and no answers.
 */
export const instant = false;

export default async function SignInPage({
  searchParams,
}: PageProps<"/signin">) {
  const { returning, error } = await searchParams;

  // Signed in is signed in, whichever way they got here.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/matches");

  const isReturning = returning === "1";
  if (!isReturning) await requireStage("signin");

  const [session, questions] = await Promise.all([getSession(), loadQuestions()]);
  const answered = session ? Object.keys(session.answers).length : 0;

  return (
    <SignInForm
      answered={answered}
      total={questions.length}
      returning={isReturning}
      initialError={
        error === "oauth"
          ? "Google sign-in didn't complete. Try again, or use your email."
          : null
      }
    />
  );
}
