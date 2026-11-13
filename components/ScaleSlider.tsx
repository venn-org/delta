"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";

/**
 * 1–5 scale input, used for ordinal questions like cleanliness.
 *
 * A real <input type="range"> drives it, kept visually hidden but on top of
 * the custom track, so keyboard, screen reader and native touch dragging all
 * work. The painted track below is decorative only.
 *
 * Motion: the value only ever lands on five discrete steps, so the fill and
 * thumb are TRANSITIONED between them — without that they teleport, which is
 * what reads as choppy. While a finger is down the transition is dropped to
 * near-zero so the thumb tracks the touch instead of lagging behind it.
 */
export function ScaleSlider({
  label,
  value,
  onChange,
  min = 1,
  max = 5,
  endLabels,
  valueLabel,
  className,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  /** e.g. ["Chill 😌", "Spotless ✨"] */
  endLabels: [string, string];
  /** e.g. "Pretty tidy" */
  valueLabel: string;
  className?: string;
}) {
  const [dragging, setDragging] = useState(false);
  const id = `scale-${label.toLowerCase().replace(/\s+/g, "-")}`;
  const percent = ((value - min) / (max - min)) * 100;

  // Snappy when settling, immediate when the finger is driving it.
  const motion = dragging
    ? "transition-none"
    : "transition-[left,width,transform] duration-[260ms] ease-[cubic-bezier(.2,.8,.2,1)]";

  return (
    <div
      className={cn(
        "flex flex-col gap-2.5 rounded-card bg-white p-4 shadow-bubble",
        className,
      )}
    >
      <label
        htmlFor={id}
        className="font-mono text-[11px] tracking-[0.12em] text-slate uppercase"
      >
        {label}
      </label>

      <div className="relative h-7">
        <div className="absolute top-3 right-0 left-0 h-1 rounded-pill bg-mist" />

        {/* Step ticks: make the five landing points legible, so the motion
            reads as snapping to a stop rather than drifting. */}
        {Array.from({ length: max - min + 1 }, (_, i) => (
          <span
            key={i}
            aria-hidden="true"
            className="absolute top-[13px] h-0.5 w-0.5 -translate-x-1/2 rounded-full bg-slate/25"
            style={{ left: `${(i / (max - min)) * 100}%` }}
          />
        ))}

        <div
          className={cn("absolute top-3 left-0 h-1 rounded-pill bg-venn-gradient", motion)}
          style={{ width: `${percent}%` }}
        />
        <div
          className={cn(
            "absolute top-0.5 h-6 w-6 rounded-full border-2 border-violet bg-white",
            "shadow-[0_2px_6px_rgba(0,0,0,.15)]",
            motion,
            dragging && "scale-110",
          )}
          style={{ left: `calc(${percent}% - 12px)` }}
        />

        <input
          id={id}
          type="range"
          min={min}
          max={max}
          step={1}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          onPointerDown={() => setDragging(true)}
          onPointerUp={() => setDragging(false)}
          onPointerCancel={() => setDragging(false)}
          onBlur={() => setDragging(false)}
          aria-valuetext={valueLabel}
          className="absolute inset-0 h-7 w-full cursor-pointer opacity-0"
        />
      </div>

      <div className="flex justify-between text-[13px] text-slate">
        <span>{endLabels[0]}</span>
        {/* Re-keyed so the label cross-fades instead of swapping abruptly. */}
        <span key={valueLabel} className="venn-rise font-bold text-ink">
          {valueLabel}
        </span>
        <span>{endLabels[1]}</span>
      </div>
    </div>
  );
}
