import { cn } from "@/lib/cn";

/**
 * The gradient "94% match" pill. Brightness pulses every 3s.
 *
 * `score` is the integer from match_results.score — never computed in the
 * client, so the number a user sees always agrees with the reasons shown
 * beside it (docs/ARCHITECTURE.md §5.1).
 */
export function MatchPill({
  score,
  className,
}: {
  score: number;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "venn-pulse inline-flex items-center rounded-pill px-[11px] py-[5px]",
        "bg-venn-gradient font-mono text-xs font-bold tracking-[0.06em] text-white uppercase",
        className,
      )}
    >
      {score}% match
    </span>
  );
}
