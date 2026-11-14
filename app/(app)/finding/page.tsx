import { redirect } from "next/navigation";
import { requireUser } from "@/server/auth";

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
  await requireUser();
  redirect("/matches");
}
