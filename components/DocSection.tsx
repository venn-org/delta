import type { ReactNode } from "react";

/** A headed block of reading text, for the privacy and terms pages. */
export function DocSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="venn-rise flex flex-col gap-2 rounded-card bg-white p-4 shadow-card">
      <h2 className="font-display text-[18px] leading-snug font-bold tracking-[-0.03em] text-ink">
        {title}
      </h2>
      <div className="flex flex-col gap-2 text-[14.5px] leading-relaxed text-slate [&_li]:ml-4 [&_li]:list-disc [&_strong]:text-ink">
        {children}
      </div>
    </section>
  );
}
