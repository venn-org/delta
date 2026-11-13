import { cn } from "@/lib/cn";

type Kind = "match" | "friction";

function CheckIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 12l5 5 9-10" />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 4l9 16H3z" />
      <path d="M12 10v4" />
      <path d="M12 17v.5" />
    </svg>
  );
}

/**
 * "Why you match" and "heads-up" tags.
 *
 * Both kinds are produced by the scorer, not written by hand: a dimension
 * scoring >= 0.85 becomes a match tag, and one scoring <= 0.4 on a
 * friction-sensitive question becomes a friction tag
 * (docs/ARCHITECTURE.md §5.1).
 */
export function Tag({
  kind,
  children,
  className,
}: {
  kind: Kind;
  children: React.ReactNode;
  className?: string;
}) {
  const isMatch = kind === "match";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-[5px] rounded-pill px-2.5 py-[5px]",
        "text-[12.5px] font-semibold",
        isMatch
          ? "bg-match-bg text-match"
          : "bg-friction-bg text-friction",
        className,
      )}
    >
      {isMatch ? <CheckIcon /> : <AlertIcon />}
      {children}
    </span>
  );
}
