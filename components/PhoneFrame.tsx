import type { ReactNode } from "react";

/**
 * Desktop presentation shell.
 *
 * Up to 860px the app fills the screen — that is the real, supported
 * experience and the only one tested on hardware. Above 860px the same 390px
 * app is parked inside a 390x844 bezel so it is reviewable on a laptop
 * (docs/ARCHITECTURE.md §12).
 *
 * `children` is rendered EXACTLY ONCE. Branching on the breakpoint with two
 * copies would mount every screen twice — two data fetches, two Realtime
 * subscriptions, two sets of effects — so the bezel is collapsed with
 * `display: contents` below the breakpoint instead.
 */
export function PhoneFrame({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh-safe relative overflow-hidden bg-canvas min-[861px]:flex min-[861px]:items-center min-[861px]:justify-center min-[861px]:gap-16">
      {/* Desktop-only canvas blobs. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 hidden overflow-hidden min-[861px]:block"
      >
        <div
          className="venn-blob-a absolute rounded-full bg-blue opacity-[0.09] blur-[30px]"
          style={{ width: 1100, height: 1100, left: -450, top: -400 }}
        />
        <div
          className="venn-blob-b absolute rounded-full bg-violet opacity-[0.09] blur-[30px]"
          style={{ width: 1000, height: 1000, right: -400, bottom: -350 }}
        />
      </div>

      {/* Desktop-only blurb. */}
      <aside className="relative z-10 hidden max-w-[360px] min-[861px]:block">
        <div className="flex items-center gap-2">
          <span aria-hidden="true" className="relative h-7 w-11">
            <span className="absolute top-0 left-0 h-7 w-7 rounded-full bg-blue opacity-90" />
            <span className="absolute top-0 right-0 h-7 w-7 rounded-full bg-violet opacity-85" />
          </span>
          <span className="font-display text-[28px] font-bold tracking-[-0.03em]">
            venn
          </span>
        </div>
        <p className="mt-5 font-display text-[34px] leading-[1.15] font-bold tracking-[-0.03em] text-ink">
          Find a flatmate who lives like you.
        </p>
        <p className="mt-3 text-[15px] leading-relaxed text-slate">
          Ten questions about how you actually live — sleep, guests, dishes.
          Then people who match, not a list of rooms.
        </p>
        <p className="mt-6 font-mono text-[11px] tracking-[0.12em] text-indigo uppercase">
          Best on your phone
        </p>
      </aside>

      {/*
        Bezel. `contents` below 861px removes this box from the layout entirely,
        so its padding, background and radius simply do not apply on a phone.
      */}
      <div
        className="contents min-[861px]:relative min-[861px]:z-10 min-[861px]:block min-[861px]:flex-none min-[861px]:bg-ink min-[861px]:p-[11px] min-[861px]:shadow-[0_30px_80px_rgba(0,0,0,.28)] min-[861px]:[border-radius:52px]"
      >
        <div className="min-h-dvh-safe relative bg-canvas min-[861px]:h-[844px] min-[861px]:min-h-0 min-[861px]:w-[390px] min-[861px]:overflow-x-hidden min-[861px]:overflow-y-auto min-[861px]:[border-radius:40px] scroll-contain">
          {children}
        </div>
      </div>
    </div>
  );
}
