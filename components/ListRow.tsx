import Link from "next/link";
import { cn, pressable } from "@/lib/cn";
import type { ReactNode } from "react";

function ChevronIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="text-slate">
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}

export function ListRow({
  href,
  onClick,
  leading,
  title,
  subtitle,
  trailing,
  showChevron = true,
  destructive = false,
  className,
}: {
  href?: string;
  onClick?: () => void;
  leading?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  trailing?: ReactNode;
  showChevron?: boolean;
  destructive?: boolean;
  className?: string;
}) {
  const content = (
    <>
      {leading}
      <span className="flex min-w-0 flex-1 flex-col gap-0.5 text-left">
        <span
          className={cn(
            "truncate text-[15px] font-semibold",
            destructive ? "text-danger" : "text-ink",
          )}
        >
          {title}
        </span>
        {subtitle && (
          <span className="truncate text-[13px] text-slate">{subtitle}</span>
        )}
      </span>
      {trailing}
      {showChevron && (href || onClick) && <ChevronIcon />}
    </>
  );

  const classes = cn(
    "flex min-h-11 w-full items-center gap-3 rounded-row bg-white px-4 py-3 no-underline",
    (href || onClick) && pressable,
    className,
  );

  if (href) {
    return (
      <Link href={href} className={classes}>
        {content}
      </Link>
    );
  }

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={cn(classes, "cursor-pointer")}>
        {content}
      </button>
    );
  }

  return <div className={classes}>{content}</div>;
}
