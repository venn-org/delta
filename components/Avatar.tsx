import { cn } from "@/lib/cn";

const sizes = {
  sm: "h-7 w-7 text-[10px]",
  md: "h-11 w-11 text-sm",
  lg: "h-14 w-14 text-base",
  xl: "h-[72px] w-[72px] text-xl",
} as const;

/**
 * Initial-letter avatar, with an optional photo.
 *
 * `name` and `src` are both nullable on purpose. For a locked match the server
 * returns SQL NULL for each (docs/ARCHITECTURE.md §6.1), and no signed URL is
 * ever minted, so there is nothing to blur — this renders a neutral shape with
 * no identity in it at all.
 */
export function Avatar({
  name,
  src,
  size = "md",
  className,
}: {
  name?: string | null;
  src?: string | null;
  size?: keyof typeof sizes;
  className?: string;
}) {
  const initial = name?.trim()?.[0]?.toUpperCase() ?? null;

  return (
    <span
      className={cn(
        "inline-flex flex-none items-center justify-center overflow-hidden rounded-full font-bold",
        initial ? "bg-ink text-white" : "bg-mist text-slate",
        sizes[size],
        className,
      )}
      aria-hidden={!name}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={name ? `${name}'s photo` : ""}
          className="h-full w-full object-cover"
        />
      ) : (
        initial
      )}
    </span>
  );
}
