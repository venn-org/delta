import { redirect } from "next/navigation";
import { resolvePosition } from "@/server/auth";

/**
 * /finding — Finding.dc.html. PLACEHOLDER.
 *
 * It is in the funnel already because `claim_onboarding_session` calls
 * `compute_matches_for` inline, and that wait is what this screen exists to
 * cover. Sign-in redirects here rather than to /matches so the contract is
 * right from the start and phase 3 only has to fill the screen in.
 *
 * Until then it is a pass-through, so it forwards to wherever the person
 * actually belongs rather than assuming /matches — someone arriving here
 * whose claim silently failed would otherwise land on a match list they
 * should not see.
 *
 * The screen itself already exists as <FindingScreen>; phase 3 renders it
 * here with real match_jobs polling behind it.
 */
export const instant = false;

export default async function FindingPage() {
  redirect((await resolvePosition()).path);
}
