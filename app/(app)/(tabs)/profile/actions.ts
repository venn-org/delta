"use server";

import { redirect } from "next/navigation";
import { signOut } from "@/server/auth";

/**
 * Ends the session and sends the user back through the entry router, which
 * resolves where a signed-out person with claimed answers belongs — rather
 * than this action deciding that for itself and getting it wrong.
 */
export async function signOutAction(): Promise<void> {
  await signOut();
  redirect("/");
}
