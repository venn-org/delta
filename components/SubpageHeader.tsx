import Link from "next/link";

/**
 * Back button and title for screens pushed from a tab (profile sub-pages,
 * legal pages). They sit outside the (tabs) group, so they show no TabBar and
 * need their own way back.
 */
export function SubpageHeader({
  backHref,
  backLabel,
  title,
  subtitle,
}: {
  backHref: string;
  backLabel: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <header className="flex flex-col gap-2 bg-paper px-gutter pt-4 pb-5">
      <Link
        href={backHref}
        aria-label={backLabel}
        className="-ml-2.5 flex h-11 w-11 items-center justify-center text-ink"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M15 5l-7 7 7 7" />
        </svg>
      </Link>
      <h1 className="font-display text-[26px] leading-tight font-bold tracking-[-0.03em] text-ink">
        {title}
      </h1>
      {subtitle && (
        <p className="text-[14.5px] leading-relaxed text-slate">{subtitle}</p>
      )}
    </header>
  );
}
