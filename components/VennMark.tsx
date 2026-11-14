import { cn } from "@/lib/cn";

/**
 * The Venn logo: two overlapping circles, blue over violet, with the lens
 * where they meet picked out — the "venn" of it.
 *
 * `inset` draws the mark on a dark disc, which is the form the bot uses as
 * its chat avatar where it sits against the canvas and needs its own ground.
 */
export function VennMark({
  size = 28,
  inset = false,
  className,
}: {
  size?: number;
  inset?: boolean;
  className?: string;
}) {
  const mark = (
    <svg
      width={inset ? Math.round(size * 0.68) : size}
      height={inset ? Math.round(size * 0.68) : size}
      viewBox="0 0 100 100"
      aria-hidden="true"
      className={inset ? undefined : className}
    >
      <circle cx="37" cy="50" r="27" fill="#335CFF" fillOpacity="0.95" />
      <circle cx="63" cy="50" r="27" fill="#8A5BFF" fillOpacity="0.85" />
      <path
        d="M50 25.5a27 27 0 0 0 0 49 27 27 0 0 0 0-49z"
        fill="#FFFFFF"
        fillOpacity="0.24"
      />
    </svg>
  );

  if (!inset) return mark;

  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex flex-none items-center justify-center rounded-full bg-ink",
        className,
      )}
      style={{ width: size, height: size }}
    >
      {mark}
    </span>
  );
}
