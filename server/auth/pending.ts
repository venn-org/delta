import "server-only";
import { cookies } from "next/headers";

/**
 * The email an OTP was just sent to, held between /signin and /verify.
 *
 * /verify needs the address again to call verifyOtp, and needs the first name
 * again to re-send a code. Neither may travel in the query string: an email
 * address in a URL lands in browser history, in the Referer header and in
 * every access log along the way. So it goes in an httpOnly cookie that JS
 * cannot read, which also means /verify is deliberately NOT deep-linkable —
 * arriving there cold sends you back to /signin, which is the correct
 * behaviour rather than a limitation.
 *
 * Short-lived on purpose: a Supabase email OTP is valid for an hour, and this
 * outlives it by a little so the screen never expires before the code does.
 */

const PENDING_COOKIE = "venn_pending_email";
const MAX_AGE_SECONDS = 70 * 60;

export interface PendingSignIn {
  email: string;
  firstName: string;
}

export async function setPendingSignIn(
  pending: PendingSignIn,
): Promise<void> {
  const jar = await cookies();
  jar.set(PENDING_COOKIE, JSON.stringify(pending), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function getPendingSignIn(): Promise<PendingSignIn | null> {
  const jar = await cookies();
  const raw = jar.get(PENDING_COOKIE)?.value;
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "email" in parsed &&
      typeof (parsed as PendingSignIn).email === "string"
    ) {
      const { email, firstName } = parsed as PendingSignIn;
      return { email, firstName: typeof firstName === "string" ? firstName : "" };
    }
  } catch {
    // A malformed cookie is treated as no cookie: /verify will send them back
    // to /signin to ask for a fresh code.
  }
  return null;
}

export async function clearPendingSignIn(): Promise<void> {
  const jar = await cookies();
  jar.delete(PENDING_COOKIE);
}
