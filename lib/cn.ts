type ClassValue = string | number | null | undefined | false | ClassValue[];

/** Joins class names, dropping falsy values. */
export function cn(...inputs: ClassValue[]): string {
  const out: string[] = [];
  for (const input of inputs) {
    if (!input) continue;
    if (Array.isArray(input)) {
      const nested = cn(...input);
      if (nested) out.push(nested);
    } else {
      out.push(String(input));
    }
  }
  return out.join(" ");
}

/**
 * Press feedback shared by every control: lifts 1px on hover, scales to 0.98
 * on press. Disabled under prefers-reduced-motion by the global rule in
 * app/globals.css.
 */
export const pressable =
  "transition-[transform,opacity,box-shadow,background-color] duration-150 hover:-translate-y-px active:scale-[0.98] active:opacity-85 disabled:pointer-events-none disabled:opacity-50";
