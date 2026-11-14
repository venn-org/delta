"use client";

import { useRef, useState, useTransition } from "react";
import { BgBlobs } from "@/components/BgBlobs";
import { Button } from "@/components/Button";
import { VennMark } from "@/components/VennMark";
import { resendCode, submitCode } from "@/app/(app)/verify/actions";

/** `aarav@gmail.com` → `aa•••@gmail.com`. The screen confirms where the code went
 *  without reprinting the whole address on a shared screen. */
function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain) return email;
  const head = local.slice(0, 2);
  return `${head}${"•".repeat(Math.max(3, local.length - 2))}@${domain}`;
}

const LENGTH = 6;

export function VerifyForm({ email }: { email: string }) {
  const [digits, setDigits] = useState<string[]>(Array(LENGTH).fill(""));
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [pending, startTransition] = useTransition();
  const inputs = useRef<Array<HTMLInputElement | null>>([]);

  const code = digits.join("");
  const complete = code.length === LENGTH;

  function send(value: string) {
    setError(null);
    startTransition(async () => {
      const result = await submitCode(value);
      // A success redirects, so reaching here means it failed.
      if (result && !result.ok) {
        setError(result.error ?? null);
        setDigits(Array(LENGTH).fill(""));
        inputs.current[0]?.focus();
      }
    });
  }

  function setAt(index: number, raw: string) {
    const typed = raw.replace(/\D/g, "");
    if (!typed) {
      setDigits((prev) => prev.map((d, i) => (i === index ? "" : d)));
      return;
    }

    // Pasting the whole code into any box fills the rest, which is what
    // people do when they copy it out of the email.
    setDigits((prev) => {
      const next = [...prev];
      for (let i = 0; i < typed.length && index + i < LENGTH; i++) {
        next[index + i] = typed[i];
      }
      const landed = Math.min(index + typed.length, LENGTH - 1);
      inputs.current[landed]?.focus();

      const joined = next.join("");
      if (joined.length === LENGTH) send(joined);
      return next;
    });
  }

  return (
    <div className="screen-h scroll-contain relative flex flex-col overflow-y-auto px-7 pt-12 pb-10">
      <BgBlobs />

      <div className="relative z-10 flex flex-1 flex-col">
        <VennMark size={40} />

        <p className="mt-6 font-mono text-[11px] tracking-[0.12em] text-indigo uppercase">
          {/* eslint-disable-next-line react/jsx-no-comment-textnodes */}
          // Check your email
        </p>

        <h1 className="mt-3 font-display text-[28px] leading-[1.15] font-bold tracking-[-0.03em] text-ink">
          Enter the six-digit code.
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-slate">
          We sent it to {maskEmail(email)}. It expires in an hour.
        </p>

        <form
          className="mt-8"
          onSubmit={(e) => {
            e.preventDefault();
            if (complete) send(code);
          }}
        >
          <div className="flex justify-between gap-2">
            {digits.map((digit, i) => (
              <input
                key={i}
                ref={(el) => {
                  inputs.current[i] = el;
                }}
                value={digit}
                onChange={(e) => setAt(i, e.target.value)}
                onKeyDown={(e) => {
                  // Backspace on an empty box steps back, so correcting a
                  // typo does not need the mouse.
                  if (e.key === "Backspace" && !digits[i] && i > 0) {
                    inputs.current[i - 1]?.focus();
                  }
                }}
                inputMode="numeric"
                autoComplete={i === 0 ? "one-time-code" : "off"}
                aria-label={`Digit ${i + 1}`}
                maxLength={LENGTH}
                disabled={pending}
                className="h-14 w-full min-w-0 rounded-field border-[1.5px] border-mist bg-white text-center font-display text-[22px] font-bold text-ink outline-none focus:border-blue disabled:opacity-60"
              />
            ))}
          </div>

          <Button
            type="submit"
            block
            disabled={!complete || pending}
            className="mt-5"
          >
            {pending ? "Checking…" : "Verify"}
          </Button>
        </form>

        {error && (
          <p role="alert" className="mt-4 text-[13px] text-friction">
            {error}
          </p>
        )}

        <button
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              setError(null);
              const result = await resendCode();
              if (result?.ok) setSent(true);
              else setError(result?.error ?? null);
            })
          }
          className="mt-6 text-center text-[13px] text-blue underline-offset-2 hover:underline disabled:opacity-60"
        >
          Didn&apos;t get it? Send another code
        </button>

        {sent && (
          <p role="status" className="mt-2 text-center text-[13px] text-slate">
            Sent. Give it a moment.
          </p>
        )}
      </div>
    </div>
  );
}
