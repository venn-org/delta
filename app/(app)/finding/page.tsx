import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * /finding — Finding.dc.html. PLACEHOLDER.
 *
 * It is in the funnel already because `claim_onboarding_session` calls
 * `compute_matches_for` inline, and that wait is what this screen exists to
 * cover. Sign-in redirects here rather than to /matches so the contract is
 * right from the start and phase 3 only has to fill the screen in.
 *
 * Until then it forwards. The merging-circles animation and the real
 * match_jobs polling are phase 3.
 */
export const instant = false;

export default async function FindingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/signin");

  redirect("/matches");
}
