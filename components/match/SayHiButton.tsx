"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/Button";
import type { SayHiResult } from "@/server/matches";

/**
 * The primary action on the match detail. Not optimistic: the button flips to
 * "sent" only once the server has accepted the interest, since a rate limit
 * or a lapsed entitlement can still refuse it.
 */
export function SayHiButton({
  candidateId,
  initiallySent,
  action,
}: {
  candidateId: string;
  initiallySent: boolean;
  action: (candidateId: string) => Promise<SayHiResult>;
}) {
  const [sent, setSent] = useState(initiallySent);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function send() {
    setError(null);
    startTransition(async () => {
      const result = await action(candidateId);
      if (result.ok) setSent(true);
      else setError(result.error);
    });
  }

  return (
    <div className="flex flex-col gap-1.5">
      <Button
        block
        variant={sent ? "ghost" : "gradient"}
        disabled={sent || pending}
        onClick={send}
      >
        <span aria-live="polite">
          {sent ? "Hi sent ✓" : pending ? "Sending…" : "Say hi 👋"}
        </span>
      </Button>
      {error && (
        <p role="alert" className="text-center text-[13px] text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
