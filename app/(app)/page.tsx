import { redirect } from "next/navigation";
import { resolvePosition } from "@/server/auth";

/**
 * / — the entry router.
 *
 * The marketing site lives in its own project on the apex domain and links
 * people straight to /onboarding, so this screen holds no content of its own.
 * It asks one question — where does this person belong? — and sends them
 * there. The answer lives in resolvePosition(), which every other route
 * uses too, so none of them can disagree about it.
 *
 * Reads the session cookie, so it blocks on the server rather than
 * prerendering (see the Cache Components notes on /onboarding/chat).
 */
export const instant = false;

export default async function Index() {
  redirect((await resolvePosition()).path);
}
