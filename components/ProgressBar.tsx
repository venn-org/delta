import { cn } from "@/lib/cn";

/**
 * Onboarding progress. Shows "Question 6 of 10" and a gradient fill that grows
 * from the left over 0.9s.
 */
export function ProgressBar({
  current,
  total,
  className,
}: {
  current: number;
  total: number;
  className?: string;
}) {
  const percent = Math.round((current / total) * 100);

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <div className="flex justify-between">
        <span className="font-mono text-[11px] tracking-[0.12em] text-slate uppercase">
          Question {current} of {total}
        </span>
        <span className="font-mono text-[11px] tracking-[0.12em] text-blue uppercase">
          {percent}%
        </span>
      </div>
      <div
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Progress to matches"
        className="h-1.5 rounded-pill bg-mist"
      >
        <div
          className="venn-grow h-1.5 rounded-pill bg-venn-gradient"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
