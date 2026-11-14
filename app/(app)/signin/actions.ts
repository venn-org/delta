"use server";

import { redirect } from "next/navigation";
import { sendEmailCode, startGoogleOAuth } from "@/server/auth";

export type SendCodeState = { ok: boolean; error?: string };

/**
 * "Send code" on the sign-in screen.
 *
 * Validated here and not only in the browser: the client's checks are a
 * convenience, and this is the only place that decides whether a code goes
 * out.
 */
export async function requestEmailCode(
  firstName: string,
  email: string,
): Promise<SendCodeState> {
  const name = firstName.trim();
  const address = email.trim();

  if (name.length === 0) {
    return { ok: false, error: "We need a first name to call you something." };
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(address)) {
    return { ok: false, error: "That doesn't look like an email address." };
  }

  const result = await sendEmailCode(address, name);
  if (!result.ok) return { ok: false, error: result.error };

  // The address itself is remembered in an httpOnly cookie, so it never has to
  // travel in the URL.
  redirect("/verify");
}

/** "Continue with Google". The redirect has to happen server-side. */
export async function beginGoogleSignIn(): Promise<SendCodeState> {
  const result = await startGoogleOAuth();
  if (!result.ok) return { ok: false, error: result.error };
  redirect(result.url);
}
