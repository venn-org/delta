import { ButtonLink } from "@/components/Button";

/**
 * / — the marketing site (Website.dc.html). A normal responsive page with no
 * phone frame. Placeholder until that screen is built; every "Try now" links
 * to /app.
 */
export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh-safe max-w-[640px] flex-col justify-center gap-6 px-6 py-20">
      <div className="flex items-center gap-2">
        <span aria-hidden="true" className="relative h-7 w-11">
          <span className="absolute top-0 left-0 h-7 w-7 rounded-full bg-blue opacity-90" />
          <span className="absolute top-0 right-0 h-7 w-7 rounded-full bg-violet opacity-85" />
        </span>
        <span className="font-display text-[28px] font-bold tracking-[-0.03em]">
          venn
        </span>
      </div>

      <h1 className="font-display text-[clamp(34px,7vw,56px)] leading-[1.1] font-bold tracking-[-0.03em] text-ink">
        Find a flatmate who lives like you.
      </h1>
      <p className="max-w-[46ch] text-[17px] leading-relaxed text-slate">
        Ten questions about how you actually live — sleep, guests, dishes, the
        things that decide whether a flat works. Then people who match.
      </p>

      <div className="flex flex-wrap gap-3">
        <ButtonLink href="/app">Try now</ButtonLink>
        <ButtonLink href="/kit" variant="ghost">
          UI kit
        </ButtonLink>
      </div>
    </main>
  );
}
