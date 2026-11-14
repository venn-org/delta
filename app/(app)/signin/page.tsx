import { redirect } from "next/navigation";
import { SignupForm } from "@/components/auth/SignupForm";
import { loadQuestions } from "@/server/onboarding/questions";
import { getSession } from "@/server/onboarding/session";

/**
 * /app/signup — Signup.dc.html.
 *
 * Comes immediately after the chat and before the finding screen: answers
 * already exist against the anonymous session and are attached to the new
 * user once they authenticate (§4.3, ADR-004).
 *
 * The design shows phone OTP. v1 ships Google OAuth + email OTP instead
 * (ADR-008), so the copy is the email variant of the same screen; phone
 * becomes a verification method on the profile later.
 */
export const instant = false;

export default async function SignupPage() {
  const [session, questions] = await Promise.all([
    getSession(),
    loadQuestions(),
  ]);

  // Nothing to save — send them back to answer the questions first.
  if (!session || Object.keys(session.answers).length === 0) {
    redirect("/app/chat");
  }

  const answered = Object.keys(session.answers).length;
  const total = questions.length;

  return <SignupForm answered={answered} total={total} />;
}
