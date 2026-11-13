"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";

const DURATION = 650;

function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
  );
}

/**
 * Onboarding progress.
 *
 * The fill TRANSITIONS between questions rather than re-running a mount
 * keyframe, so advancing from 50% to 60% animates the 10% rather than
 * replaying the whole bar. The first paint still grows from zero.
 *
 * The percentage counts up alongside the fill — a number that snaps while the
 * bar glides is the thing that makes an otherwise smooth bar look broken.
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

  // Starts at 0 so the first render animates in.
  const [width, setWidth] = useState(0);
  const [display, setDisplay] = useState(0);
  const fromRef = useRef(0);
  const frameRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (prefersReducedMotion()) {
      // Deferred a frame rather than set inline: a synchronous setState in an
      // effect body cascades an extra render, and there is nothing to animate
      // here anyway.
      const jump = requestAnimationFrame(() => {
        setWidth(percent);
        setDisplay(percent);
        fromRef.current = percent;
      });
      return () => cancelAnimationFrame(jump);
    }

    // One frame later, so the browser has a start value to transition from.
    const raf = requestAnimationFrame(() => setWidth(percent));

    const from = fromRef.current;
    const start = performance.now();

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / DURATION);
      // Matches the cubic-bezier(.2,.8,.2,1) feel of the bar itself.
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(from + (percent - from) * eased));
      if (t < 1) {
        frameRef.current = requestAnimationFrame(tick);
      } else {
        fromRef.current = percent;
      }
    };
    frameRef.current = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      fromRef.current = percent;
    };
  }, [percent]);

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <div className="flex justify-between">
        <span className="font-mono text-[11px] tracking-[0.12em] text-slate uppercase">
          Question {current} of {total}
        </span>
        {/* tabular-nums stops the label jittering as digits change width. */}
        <span className="font-mono text-[11px] tabular-nums tracking-[0.12em] text-blue uppercase">
          {display}%
        </span>
      </div>
      <div
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Progress to matches"
        className="h-1.5 overflow-hidden rounded-pill bg-mist"
      >
        <div
          className="h-1.5 rounded-pill bg-venn-gradient transition-[width] duration-[650ms] ease-[cubic-bezier(.2,.8,.2,1)]"
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}
