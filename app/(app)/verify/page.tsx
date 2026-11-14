import { redirect } from "next/navigation";
import { VerifyForm } from "@/components/auth/VerifyForm";
import { createClient } from "@/lib/supabase/server";
import { getPendingSignIn } from "@/server/auth";

/**
 * /verify — OTP.dc.html, email variant.
 *
 * The design's copy is written for phone ("+91 98201 •••67"). v1 sends an
 * email code instead (ADR-008), so the same screen shows a masked email
 * address.
 *
 * Not deep-linkable by design: the address lives in an httpOnly cookie, so
 * arriving here without having asked for a code sends you back to /signin.
 */
export const instant = false;

export default async function VerifyPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/matches");

  const pending = await getPendingSignIn();
  if (!pending) redirect("/signin");

  return <VerifyForm email={pending.email} />;
}
