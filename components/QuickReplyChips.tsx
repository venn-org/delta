"use client";

import { useCallback, useEffect, useLayoutEffect, useRef } from "react";
import { cn } from "@/lib/cn";

export interface ChipOption {
  value: string;
  label: string;
  emoji?: string;
}

/**
 * Quick-reply chips for the onboarding chat.
 *
 * `options` comes from questions.options in the database, not from a hardcoded
 * list — rewording an answer is an UPDATE, not a deploy
 * (docs/ARCHITECTURE.md §4.2 / ADR-009).
 *
 * Motion, two parts:
 *  1. In single-select the blue fill is ONE pill that SLIDES between chips
 *     rather than each chip repainting. Its geometry is measured from the live
 *     DOM, so it tracks wrapped rows and variable label widths.
 *  2. Colour, border and label ease together on one curve. Previously only
 *     `background-color` was in the transition list, so the ring and the text
 *     snapped while the fill faded — that mismatch is what read as choppy.
 *
 * The pill is positioned by writing to its style directly rather than through
 * React state: a measure-then-setState pass would re-render the whole group on
 * every reflow, and the ResizeObserver can fire often.
 */
export function QuickReplyChips({
  options,
  selected,
  onSelect,
  multi = false,
  disabled = false,
  className,
}: {
  options: ChipOption[];
  selected?: string | string[] | null;
  onSelect: (value: string) => void;
  multi?: boolean;
  disabled?: boolean;
  className?: string;
}) {
  const isSelected = (value: string) =>
    Array.isArray(selected) ? selected.includes(value) : selected === value;

  const containerRef = useRef<HTMLDivElement>(null);
  const indicatorRef = useRef<HTMLSpanElement>(null);
  const chipRefs = useRef(new Map<string, HTMLButtonElement>());

  const activeValue = !multi && typeof selected === "string" ? selected : null;

  const position = useCallback(() => {
    const pill = indicatorRef.current;
    if (!pill) return;

    const el = activeValue ? chipRefs.current.get(activeValue) : null;
    if (!el) {
      pill.style.opacity = "0";
      return;
    }

    // The first placement must NOT animate, or a pre-selected answer
    // (returning via Chat-resume) flies in from the corner. Suppress the
    // transition, position, force a reflow so the browser commits that
    // position, then hand the transition back.
    const first = pill.dataset.ready !== "1";
    if (first) pill.style.transition = "none";

    pill.style.left = `${el.offsetLeft}px`;
    pill.style.top = `${el.offsetTop}px`;
    pill.style.width = `${el.offsetWidth}px`;
    pill.style.height = `${el.offsetHeight}px`;
    pill.style.opacity = "1";

    if (first) {
      void pill.offsetWidth; // reflow
      pill.style.transition = "";
      pill.dataset.ready = "1";
    }
  }, [activeValue]);

  useLayoutEffect(position, [position, options]);

  // Chips reflow when the viewport changes or a webfont finishes loading; the
  // pill has to follow or it ends up parked under the wrong chip.
  useEffect(() => {
    const container = containerRef.current;
    if (!container || typeof ResizeObserver === "undefined") return;

    const ro = new ResizeObserver(() => position());
    ro.observe(container);
    for (const el of chipRefs.current.values()) ro.observe(el);
    return () => ro.disconnect();
  }, [position]);

  return (
    <div
      ref={containerRef}
      className={cn("relative flex flex-wrap gap-2", className)}
      role={multi ? "group" : "radiogroup"}
    >
      {!multi && (
        <span
          ref={indicatorRef}
          aria-hidden="true"
          // Deliberately NO style prop. React owns the style attribute of any
          // element it is given one for, and would wipe the geometry written
          // in `position()` on the next render. The starting state is a class
          // instead, which the inline styles then override.
          className={cn(
            "pointer-events-none absolute top-0 left-0 z-0 h-0 w-0 rounded-pill bg-blue opacity-0",
            "shadow-[0_4px_12px_rgba(51,92,255,.28)]",
            "transition-[left,top,width,height,opacity] duration-300",
            "ease-[cubic-bezier(.2,.8,.2,1)]",
          )}
        />
      )}

      {options.map((option) => {
        const active = isSelected(option.value);

        return (
          <button
            key={option.value}
            ref={(el) => {
              if (el) chipRefs.current.set(option.value, el);
              else chipRefs.current.delete(option.value);
            }}
            type="button"
            disabled={disabled}
            role={multi ? "checkbox" : "radio"}
            aria-checked={active}
            onClick={() => onSelect(option.value)}
            className={cn(
              "relative z-10 min-h-11 cursor-pointer rounded-pill border-[1.5px] px-4 py-2.5",
              "font-ui text-sm font-semibold",
              "transition-[color,background-color,border-color,transform,opacity,box-shadow]",
              "duration-[260ms] ease-[cubic-bezier(.2,.8,.2,1)]",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue",
              "hover:-translate-y-px active:scale-[0.97]",
              "disabled:pointer-events-none disabled:opacity-50",
              active ? "border-blue text-white" : "border-mist text-ink",
              // In single-select the sliding pill paints the fill, so the chip
              // stays transparent. In multi-select it paints its own.
              multi
                ? active
                  ? "bg-blue"
                  : "bg-white"
                : active
                  ? "bg-transparent"
                  : "bg-white",
            )}
          >
            {option.emoji ? `${option.emoji} ${option.label}` : option.label}
          </button>
        );
      })}
    </div>
  );
}
