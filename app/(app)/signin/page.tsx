import { redirect } from "next/navigation";
import { SignInForm } from "@/components/auth/SignInForm";
import { createClient } from "@/lib/supabase/server";
import { getSession, loadQuestions } from "@/server/onboarding";

/**
 * /signin — Signup.dc.html.
 *
 * Normally reached at the end of the chat: answers already exist against the
 * anonymous session and get attached to the new user once they authenticate
 * (§4.3, ADR-004).
 *
 * But it is ALSO where a cold visitor to the bare domain lands, with no
 * session and nothing to claim. That case must work: this screen does not
 * bounce someone back to the chat for having no answers, it changes its copy
 * and offers the chat as a link. Bouncing would make `/` and `/signin`
 * redirect into each other.
 *
 * The design shows phone OTP. v1 ships Google OAuth + email OTP instead
 * (ADR-008), so the copy is the email variant of the same screen; phone
 * becomes a verification method on the profile later.
 */
export const instant = false;

export default async function SignInPage({
  searchParams,
}: PageProps<"/signin">) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/matches");

  const [session, questions] = await Promise.all([getSession(), loadQuestions()]);

  const answered = session ? Object.keys(session.answers).length : 0;

  // /auth/callback sends people back here with ?error=oauth rather than
  // rendering its own failure page.
  const { error } = await searchParams;

  return (
    <SignInForm
      answered={answered}
      total={questions.length}
      initialError={
        error === "oauth"
          ? "Google sign-in didn't complete. Try again, or use your email."
          : null
      }
    />
  );
}
