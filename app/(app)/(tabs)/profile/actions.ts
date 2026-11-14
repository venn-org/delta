"use server";

import { redirect } from "next/navigation";
import { signOut } from "@/server/auth";

/**
 * Ends the session and goes to the sign-in form.
 *
 * Not "/" — the entry router would resolve a signed-out visitor with no
 * onboarding cookie to the intro screen, so signing out would hand somebody
 * who already has an account the ten questions again. `?returning=1` is the
 * same escape hatch the "Already have an account?" link uses.
 */
export async function signOutAction(): Promise<void> {
  await signOut();
  redirect("/signin?returning=1");
}
