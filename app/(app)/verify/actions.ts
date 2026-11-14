"use server";

import { redirect } from "next/navigation";
import { sendEmailCode, verifyEmailCode, getPendingSignIn } from "@/server/auth";

export type VerifyState = { ok: boolean; error?: string };

/**
 * Submits the six-digit code.
 *
 * The address comes from the httpOnly cookie, not from the form — otherwise
 * anyone could verify a code against someone else's email by editing a hidden
 * field.
 */
export async function submitCode(code: string): Promise<VerifyState> {
  const pending = await getPendingSignIn();
  if (!pending) {
    redirect("/signin");
  }

  const digits = code.replace(/\D/g, "");
  if (digits.length !== 6) {
    return { ok: false, error: "The code is six digits." };
  }

  const result = await verifyEmailCode(pending.email, digits);
  if (!result.ok) return { ok: false, error: result.error };

  // Signed in either way. If the claim failed, those answers are still behind
  // the onboarding cookie and `/` routes them back into the chat — never to an
  // empty match list (anti-goal A4).
  redirect(result.claim.ok ? "/finding" : "/onboarding/chat");
}

/** "Didn't get it? Send again." */
export async function resendCode(): Promise<VerifyState> {
  const pending = await getPendingSignIn();
  if (!pending) {
    redirect("/signin");
  }

  const result = await sendEmailCode(pending.email, pending.firstName);
  if (!result.ok) return { ok: false, error: result.error };
  return { ok: true };
}
