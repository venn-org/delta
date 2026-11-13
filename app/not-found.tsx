import { ButtonLink } from "@/components/Button";

/**
 * 404.
 *
 * The wordmark is two overlapping circles, so the not-found state simply
 * pulls them apart — the brand carries the joke and the page needs no
 * illustration.
 */
export default function NotFound() {
  return (
    <main className="min-h-dvh-safe relative flex flex-col items-center justify-center gap-6 overflow-hidden bg-canvas px-7 text-center">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div
          className="venn-blob-a absolute rounded-full bg-blue opacity-[0.07] blur-[30px]"
          style={{ width: 420, height: 420, left: -170, top: -150 }}
        />
        <div
          className="venn-blob-b absolute rounded-full bg-violet opacity-[0.07] blur-[30px]"
          style={{ width: 380, height: 380, right: -150, bottom: -130 }}
        />
      </div>

      {/* Separated circles: the venn mark, not overlapping. */}
      <div aria-hidden="true" className="relative z-10 h-14 w-[132px]">
        <span className="absolute top-0 left-0 h-14 w-14 rounded-full bg-blue opacity-90" />
        <span className="absolute top-0 right-0 h-14 w-14 rounded-full bg-violet opacity-85" />
      </div>

      <div className="relative z-10">
        <p className="font-mono text-[11px] tracking-[0.12em] text-indigo uppercase">
          Error 404
        </p>
        <h1 className="mt-3 font-display text-[32px] leading-[1.15] font-bold tracking-[-0.03em] text-ink">
          These two didn&apos;t overlap.
        </h1>
        <p className="mt-3 max-w-[32ch] text-[15px] leading-relaxed text-slate">
          The page you&apos;re after isn&apos;t here. Your matches still are.
        </p>
      </div>

      <div className="relative z-10 mt-2 flex flex-wrap justify-center gap-3">
        <ButtonLink href="/app">Back to Venn</ButtonLink>
        <ButtonLink href="/" variant="ghost">
          Home
        </ButtonLink>
      </div>
    </main>
  );
}
