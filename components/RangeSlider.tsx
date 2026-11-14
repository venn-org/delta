"use client";

import { cn } from "@/lib/cn";

/** ₹18,000 → "₹18k", ₹7,500 → "₹7.5k" */
export function formatRupees(n: number): string {
  const k = n / 1000;
  return `₹${Number.isInteger(k) ? k : k.toFixed(1)}k`;
}

/**
 * Two-handle range slider, the shape people know from shopping filters.
 *
 * Built on two native <input type="range"> rather than pointer maths, so
 * keyboard, screen readers and touch all work for free. The handles cannot
 * cross: each clamps against the other one step away.
 */
export function RangeSlider({
  min,
  max,
  step = 1000,
  valueMin,
  valueMax,
  onChange,
  disabled,
  className,
}: {
  min: number;
  max: number;
  step?: number;
  valueMin: number;
  valueMax: number;
  onChange: (next: { min: number; max: number }) => void;
  disabled?: boolean;
  className?: string;
}) {
  const span = max - min;
  const pct = (v: number) => ((v - min) / span) * 100;

  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-card bg-white p-4 shadow-bubble",
        className,
      )}
    >
      <div className="flex items-baseline justify-between">
        <span className="font-mono text-[11px] tracking-[0.12em] text-slate uppercase">
          Monthly budget
        </span>
        <span className="font-display text-[17px] font-bold tracking-[-0.03em] text-ink tabular-nums">
          {formatRupees(valueMin)} – {formatRupees(valueMax)}
          {valueMax >= max && "+"}
        </span>
      </div>

      <div className="relative h-6">
        {/* Track */}
        <div className="absolute top-[10px] right-0 left-0 h-1 rounded-pill bg-mist" />
        {/* Selected span */}
        <div
          className="absolute top-[10px] h-1 rounded-pill bg-venn-gradient"
          style={{
            left: `${pct(valueMin)}%`,
            width: `${pct(valueMax) - pct(valueMin)}%`,
          }}
        />

        <input
          type="range"
          className="dual-range"
          min={min}
          max={max}
          step={step}
          value={valueMin}
          disabled={disabled}
          aria-label="Minimum budget"
          aria-valuetext={formatRupees(valueMin)}
          onChange={(e) =>
            onChange({
              min: Math.min(Number(e.target.value), valueMax - step),
              max: valueMax,
            })
          }
        />
        <input
          type="range"
          className="dual-range"
          min={min}
          max={max}
          step={step}
          value={valueMax}
          disabled={disabled}
          aria-label="Maximum budget"
          aria-valuetext={formatRupees(valueMax)}
          onChange={(e) =>
            onChange({
              min: valueMin,
              max: Math.max(Number(e.target.value), valueMin + step),
            })
          }
        />
      </div>

      <div className="flex justify-between text-[13px] text-slate">
        <span>{formatRupees(min)}</span>
        <span>{formatRupees(max)}+</span>
      </div>
    </div>
  );
}
