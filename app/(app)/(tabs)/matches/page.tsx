import Link from "next/link";
import { BgBlobs } from "@/components/BgBlobs";
import { ButtonLink } from "@/components/Button";
import { MatchCard } from "@/components/MatchCard";
import { VennMark } from "@/components/VennMark";
import { requireStage } from "@/server/auth";
import { getMatchList, hasUnlockedAll } from "@/server/matches";
import type { MatchListItem } from "@/lib/types";

/**
 * /matches — the ranked list.
 *
 * Three states, all of them this one file: the list with a free tier, the
 * list fully unlocked, and nothing to show yet.
 *
 * The free-tier gate is NOT implemented here. `get_match_list` decides what a
 * viewer may see and returns NULL for everything else, so the split below
 * reads `isLocked` purely to decide layout — the data for a locked card never
 * reaches this process (docs/ARCHITECTURE.md §6.1). A bug in this file can
 * therefore make the screen ugly but cannot leak a name.
 *
 * Reads the session, so it blocks on the server rather than prerendering.
 */
export const instant = false;

function LockIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  );
}

export default async function MatchesPage() {
  // Not just "is there a user?" — a signed-in person whose answers were never
  // claimed has no business on a match list, and belongs back in the chat.
  await requireStage("app");

  const [matches, unlocked] = await Promise.all([
    getMatchList(),
    hasUnlockedAll(),
  ]);

  if (matches.length === 0) return <NoMatches />;

  const open = matches.filter((match) => !match.isLocked);
  const locked = matches.filter((match) => match.isLocked);

  return (
    <div className="relative min-h-full bg-canvas">
      <BgBlobs />

      <div className="relative z-10 flex flex-col gap-3.5 px-gutter py-5">
        <header className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <VennMark size={22} />
            <span className="font-display text-[18px] font-bold tracking-[-0.03em]">
              venn
            </span>
          </span>
          <span className="font-mono text-[10px] tracking-[0.12em] text-slate uppercase">
            {unlocked ? "Unlocked" : "Free plan"}
          </span>
        </header>

        <div>
          <p className="font-mono text-[11px] tracking-[0.12em] text-indigo uppercase">
            {`// ${matches.length} strong ${matches.length === 1 ? "match" : "matches"}`}
          </p>
          <h1 className="mt-2 font-display text-[30px] leading-[1.1] font-bold tracking-[-0.03em] text-ink">
            Your people, ranked.
          </h1>
          <p className="mt-1.5 text-[14.5px] leading-relaxed text-slate">
            {unlocked
              ? "Everyone we found, in order of how well you actually fit."
              : `Your top ${open.length} ${open.length === 1 ? "is" : "are"} free. Unlock the rest whenever you're ready.`}
          </p>
        </div>

        {open.map((match) => (
          <MatchCard key={match.candidateId} match={match} />
        ))}

        {locked.length > 0 && (
          <>
            <LockedDivider />
            {locked.map((match) => (
              <MatchCard key={match.candidateId} match={match} />
            ))}
          </>
        )}

        {/*
          Spacer, so the last card can be scrolled clear of the unlock bar
          that floats over the bottom of the list. Padding on the column would
          not do it: the bar is sticky, and sits above that padding.
        */}
        {locked.length > 0 && <div aria-hidden="true" className="h-24" />}
      </div>

      {locked.length > 0 && <UnlockBar locked={locked} />}
    </div>
  );
}

function LockedDivider() {
  return (
    <div className="flex items-center gap-2.5 font-mono text-[10.5px] tracking-[0.12em] text-slate uppercase">
      <span aria-hidden="true" className="h-px flex-1 bg-mist" />
      <LockIcon />
      Locked
      <span aria-hidden="true" className="h-px flex-1 bg-mist" />
    </div>
  );
}

/**
 * The upsell. Sticky at the bottom of the scroll container, so it stays in
 * view while the locked cards scroll past it — the cards are the argument for
 * it, and a bar at the very end of a long list is a bar nobody reaches.
 */
function UnlockBar({ locked }: { locked: MatchListItem[] }) {
  return (
    <div className="sticky bottom-0 z-20 bg-gradient-to-t from-canvas from-30% to-transparent px-gutter pt-6 pb-4">
      <div className="flex items-center gap-3 rounded-card bg-ink p-4 shadow-[0_10px_30px_rgba(0,0,0,.2)]">
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-bold text-white">
            {locked.length} more {locked.length === 1 ? "person" : "people"}{" "}
            match you
          </p>
          <p className="text-[13px] text-mist">
            One-time ₹99 · unlock all, forever
          </p>
        </div>
        <ButtonLink href="/unlock" className="min-h-12 px-[18px] text-[15px]">
          <LockIcon />
          Unlock
        </ButtonLink>
      </div>
    </div>
  );
}

/**
 * Nothing to show. Two different situations reach this, and it does not
 * pretend to tell them apart: the matcher has not run yet, or it ran and
 * found nobody. Either way the honest thing to offer is a wider search.
 */
function NoMatches() {
  return (
    <div className="relative min-h-full">
      <BgBlobs />

      <div className="relative z-10 flex min-h-full flex-col items-center justify-center gap-3.5 bg-paper px-8 py-12 text-center">
        <span aria-hidden="true" className="relative h-16 w-[102px] opacity-50">
          <span className="absolute top-0 left-0 h-16 w-16 rounded-full bg-blue opacity-90" />
          <span className="absolute top-0 right-0 h-16 w-16 rounded-full bg-violet opacity-85" />
        </span>

        <h1 className="mt-3 font-display text-[28px] leading-[1.15] font-bold tracking-[-0.03em] text-ink">
          No matches yet
        </h1>
        <p className="text-[15px] leading-relaxed text-slate">
          Nobody fits your area and budget right now. Widen either one, or
          we&apos;ll tell you when someone new joins.
        </p>

        <div className="mt-3 flex w-full flex-col gap-2.5">
          <ButtonLink href="/onboarding/chat" block>
            Widen my search
          </ButtonLink>
          <Link
            href="/profile"
            className="text-[14px] font-semibold text-blue no-underline"
          >
            Notify me instead
          </Link>
        </div>
      </div>
    </div>
  );
}
