import Link from "next/link";
import { cn, pressable } from "@/lib/cn";
import type { ButtonHTMLAttributes, ComponentProps, ReactNode } from "react";

type Variant = "gradient" | "ink" | "ghost";

const variants: Record<Variant, string> = {
  // Primary CTA. The gradient is reserved for this, the match pill and the
  // progress fill — never a page background.
  gradient: "bg-venn-gradient text-white border-0",
  ink: "bg-ink text-white border-0",
  ghost: "bg-white text-ink border-[1.5px] border-mist",
};

export function buttonClasses({
  variant = "gradient",
  block = false,
  className,
}: {
  variant?: Variant;
  block?: boolean;
  className?: string;
} = {}) {
  return cn(
    "inline-flex min-h-[52px] cursor-pointer items-center justify-center gap-2",
    "rounded-pill px-[22px] py-[14px] font-ui text-base font-bold no-underline",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue",
    variants[variant],
    block && "w-full",
    pressable,
    className,
  );
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  /** Stretches to the container width — the standard for sheet and form CTAs. */
  block?: boolean;
  children: ReactNode;
}

export function Button({
  variant,
  block,
  className,
  type = "button",
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={buttonClasses({ variant, block, className })}
      {...props}
    >
      {children}
    </button>
  );
}

/**
 * The same control when it navigates.
 *
 * Use this rather than wrapping <Button> in a <Link>: a <button> inside an
 * <a> is invalid HTML and breaks keyboard and screen-reader behaviour.
 */
export function ButtonLink({
  variant,
  block,
  className,
  children,
  ...props
}: ComponentProps<typeof Link> & {
  variant?: Variant;
  block?: boolean;
  children: ReactNode;
}) {
  return (
    <Link className={buttonClasses({ variant, block, className })} {...props}>
      {children}
    </Link>
  );
}
