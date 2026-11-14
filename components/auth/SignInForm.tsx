"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { BgBlobs } from "@/components/BgBlobs";
import { Button } from "@/components/Button";
import { VennMark } from "@/components/VennMark";
import {
  beginGoogleSignIn,
  requestEmailCode,
} from "@/app/(app)/signin/actions";

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M23 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.16a5.27 5.27 0 0 1-2.29 3.46v2.88h3.7C21.72 18.84 23 15.86 23 12.27z" />
      <path fill="#34A853" d="M12 23.5c3.1 0 5.7-1.03 7.6-2.78l-3.71-2.88c-1.03.69-2.35 1.1-3.89 1.1-2.99 0-5.52-2.02-6.42-4.73H1.75v2.97A11.5 11.5 0 0 0 12 23.5z" />
      <path fill="#FBBC05" d="M5.58 14.21a6.9 6.9 0 0 1 0-4.42V6.82H1.75a11.5 11.5 0 0 0 0 10.36l3.83-2.97z" />
      <path fill="#EA4335" d="M12 5.05c1.69 0 3.2.58 4.39 1.72l3.29-3.29C17.7 1.6 15.1.5 12 .5A11.5 11.5 0 0 0 1.75 6.82l3.83 2.97C6.48 7.07 9.01 5.05 12 5.05z" />
    </svg>
  );
}

/**
 * Save-your-answers screen — and the plain sign-in screen.
 *
 * Two independent paths on purpose (ADR-008): if email delivery fails, Google
 * still gets someone in.
 *
 * `answered === 0` means this is somebody who arrived at the bare domain
 * rather than someone finishing the chat. The screen still works: it drops the
 * "save your answers" framing and points at the chat instead.
 */
export function SignInForm({
  answered,
  total,
  initialError = null,
}: {
  answered: number;
  total: number;
  initialError?: string | null;
}) {
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(initialError);
  const [pending, startTransition] = useTransition();

  const hasAnswers = answered > 0;
  const emailLooksValid = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim());
  const canSend = firstName.trim().length > 0 && emailLooksValid && !pending;

  return (
    <div className="screen-h scroll-contain relative flex flex-col overflow-y-auto px-7 pt-12 pb-10">
      <BgBlobs />

      <div className="relative z-10 flex flex-1 flex-col">
        <VennMark size={40} />

        {hasAnswers ? (
          <p className="mt-6 font-mono text-[11px] tracking-[0.12em] text-indigo uppercase">
            {answered >= total
              ? `// That's all ${total} questions ✓`
              : `// ${answered} of ${total} answered`}
          </p>
        ) : (
          <p className="mt-6 font-mono text-[11px] tracking-[0.12em] text-indigo uppercase">
            {"// Welcome back"}
          </p>
        )}

        <h1 className="mt-3 font-display text-[28px] leading-[1.15] font-bold tracking-[-0.03em] text-ink">
          {hasAnswers
            ? "Nice! Save your answers and we'll find your matches."
            : "Sign in to pick up where you left off."}
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-slate">
          We&apos;ll email you a code. Your email is never shown to matches.
        </p>

        <form
          className="mt-7 flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            startTransition(async () => {
              const result = await requestEmailCode(firstName, email);
              // A success redirects, so reaching here at all means it failed.
              if (result && !result.ok) setError(result.error ?? null);
            });
          }}
        >
          <Field label="First name">
            <input
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              autoComplete="given-name"
              placeholder="Aarav"
              className="w-full rounded-field border-[1.5px] border-mist bg-white px-3.5 py-3 text-ink outline-none placeholder:text-slate/60 focus:border-blue"
            />
          </Field>

          <Field label="Email">
            <input
              type="email"
              inputMode="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-field border-[1.5px] border-mist bg-white px-3.5 py-3 text-ink outline-none placeholder:text-slate/60 focus:border-blue"
            />
          </Field>

          <Button type="submit" block disabled={!canSend} className="mt-1">
            {pending ? "Sending…" : "Send code"}
          </Button>
        </form>

        <div className="my-5 flex items-center gap-3">
          <span className="h-px flex-1 bg-mist" />
          <span className="font-mono text-[11px] tracking-[0.12em] text-slate uppercase">
            or
          </span>
          <span className="h-px flex-1 bg-mist" />
        </div>

        <Button
          variant="ghost"
          block
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              setError(null);
              const result = await beginGoogleSignIn();
              if (result && !result.ok) setError(result.error ?? null);
            })
          }
        >
          <GoogleIcon />
          Continue with Google
        </Button>

        {error && (
          <p role="alert" className="mt-4 text-[13px] text-friction">
            {error}
          </p>
        )}

        {!hasAnswers && (
          <p className="mt-6 text-center text-[13px] leading-relaxed text-slate">
            First time here?{" "}
            <Link
              href="/onboarding"
              className="text-blue underline-offset-2 hover:underline"
            >
              Answer the questions
            </Link>{" "}
            — it takes about two minutes.
          </p>
        )}

        <p className="mt-auto pt-8 text-center text-[12px] leading-relaxed text-slate">
          By continuing you agree to the{" "}
          <Link href="/terms" className="text-blue underline-offset-2 hover:underline">
            Terms
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="text-blue underline-offset-2 hover:underline">
            Privacy policy
          </Link>
          .
        </p>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="font-mono text-[11px] tracking-[0.12em] text-slate uppercase">
        {label}
      </span>
      {children}
    </label>
  );
}
