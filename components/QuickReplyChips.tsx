"use client";

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
 * Motion: selection used to snap because only `background-color` sat in the
 * transition list — `border-color` and `color` did not, so the ring and the
 * label flipped instantly while the fill faded. That mismatch is what read as
 * choppy. All three now ease together on the house curve, and the chosen chip
 * settles with a small scale so selection reads as a landing.
 *
 * A single pill sliding between chips was tried and rejected: it animates
 * `left`/`width`, which forces layout on every frame rather than running on
 * the compositor — the opposite of what we want on a mid-range Android. Colour
 * and `transform` are both compositor-friendly.
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

  return (
    <div
      className={cn("flex flex-wrap gap-2", className)}
      role={multi ? "group" : "radiogroup"}
    >
      {options.map((option) => {
        const active = isSelected(option.value);

        return (
          <button
            key={option.value}
            type="button"
            disabled={disabled}
            role={multi ? "checkbox" : "radio"}
            aria-checked={active}
            onClick={() => onSelect(option.value)}
            className={cn(
              "min-h-11 cursor-pointer rounded-pill border-[1.5px] px-4 py-2.5",
              "font-ui text-sm font-semibold",
              // Everything that changes on selection eases on one curve.
              "transition-[color,background-color,border-color,transform,box-shadow,opacity]",
              "duration-[260ms] ease-[cubic-bezier(.2,.8,.2,1)]",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue",
              "hover:-translate-y-px active:scale-[0.97]",
              "disabled:pointer-events-none disabled:opacity-50",
              active
                ? "scale-[1.03] border-blue bg-blue text-white shadow-[0_4px_12px_rgba(51,92,255,.28)]"
                : "scale-100 border-mist bg-white text-ink shadow-none",
            )}
          >
            {option.emoji ? `${option.emoji} ${option.label}` : option.label}
          </button>
        );
      })}
    </div>
  );
}
