import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Avatar } from "@/components/Avatar";
import { BgBlobs } from "@/components/BgBlobs";
import { ButtonLink } from "@/components/Button";
import { MatchPill } from "@/components/MatchPill";
import { SayHiButton } from "@/components/match/SayHiButton";
import { requireStage } from "@/server/auth";
import { getMatchDetail } from "@/server/matches";
import type { AnswerComparison } from "@/lib/types";
import { sayHiAction } from "./actions";

/**
 * /matches/[id] — the side-by-side detail (Match-detail.dc.html).
 *
 * The entitlement check is `get_match_detail`'s: it raises for a candidate
 * this viewer has not unlocked, and getMatchDetail turns that into "locked",
 * which goes to the paywall. Nothing about a locked candidate ever reaches
 * this process, so there is no redacted rendering here to get wrong.
 *
 * Outside the (tabs) group: the detail screen has its own back affordance and
 * shows no TabBar.
 */
export const instant = false;

function BackIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M15 5l-7 7 7 7" />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="mt-px flex-none text-friction">
      <path d="M12 4l9 16H3z" />
      <path d="M12 10v4" />
      <path d="M12 17v.5" />
    </svg>
  );
}

const eyebrow = "font-mono text-[10.5px] tracking-[0.12em] text-slate uppercase";

export default async function MatchDetailPage({
  params,
}: PageProps<"/matches/[id]">) {
  await requireStage("app");
  const { id } = await params;

  const result = await getMatchDetail(id);
  if (result.status === "locked") redirect("/unlock");
  if (result.status === "not_found") notFound();

  const match = result.match;
  const name = match.displayName ?? "Your match";
  const first = firstName(name);
  const subtitle = [
    [match.occupation, match.employer].filter(Boolean).join(", "),
    match.areaName,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="relative min-h-full bg-canvas">
      <BgBlobs />

      <div className="relative z-10">
        <header className="flex flex-col gap-3.5 bg-paper px-gutter pt-4 pb-5">
          <Link
            href="/matches"
            aria-label="Back to matches"
            className="-ml-2.5 flex h-11 w-11 items-center justify-center text-ink"
          >
            <BackIcon />
          </Link>

          <div className="venn-rise flex items-center gap-3.5">
            <Avatar
              name={match.displayName}
              src={match.avatarUrl}
              size="xl"
              className="text-[27px]"
            />
            <div className="min-w-0">
              <h1 className="font-display text-[28px] leading-[1.15] font-bold tracking-[-0.03em] text-ink">
                {name}
                {match.age != null && `, ${match.age}`}
              </h1>
              {subtitle && <p className="text-[14px] text-slate">{subtitle}</p>}
              <MatchPill score={match.score} className="mt-2" />
            </div>
          </div>

          {match.idealSunday && (
            <Quote label={`${first}'s ideal Sunday`} text={match.idealSunday} />
          )}
          {match.petPeeve && (
            <Quote label="Biggest flatmate pet peeve" text={match.petPeeve} />
          )}

          {match.frictions.length > 0 && (
            <div className="venn-rise flex gap-2.5 rounded-row bg-friction-bg px-3.5 py-3 text-[14px] leading-[1.4] text-[#7A3A00]">
              <AlertIcon />
              <p>
                <strong>Heads-up:</strong>{" "}
                {match.frictions.map((f) => f.label).join(" · ")}. Worth
                agreeing on early.
              </p>
            </div>
          )}
        </header>

        {match.answers.length > 0 && (
          <section
            aria-label="Your answers side by side"
            className="px-gutter pt-2 pb-5"
          >
            <div className="grid grid-cols-2 pt-3 pb-1 text-[14px] font-bold">
              <span className="text-ink">You</span>
              <span className="text-blue">{first}</span>
            </div>
            {match.answers.map((row) => (
              <ComparisonRow key={row.key} row={row} />
            ))}
          </section>
        )}

        {/* Keeps the last row clear of the action bar floating over it. */}
        <div aria-hidden="true" className="h-24" />
      </div>

      <div className="sticky bottom-0 z-20 flex items-start gap-2.5 border-t border-mist bg-paper px-gutter pt-3.5 pb-6">
        <div className="flex-1">
          <ButtonLink href="/matches" variant="ghost" block>
            Pass
          </ButtonLink>
        </div>
        <div className="flex-[2]">
          <SayHiButton
            candidateId={match.candidateId}
            initiallySent={match.hiSent}
            action={sayHiAction}
          />
        </div>
      </div>
    </div>
  );
}

function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] || name;
}

function Quote({ label, text }: { label: string; text: string }) {
  return (
    <blockquote className="venn-rise m-0 rounded-row bg-canvas px-4 py-3.5">
      <p className={eyebrow}>{label}</p>
      <p className="mt-1.5 font-display text-[18px] leading-[1.3] tracking-[-0.03em] text-ink">
        &ldquo;{text}&rdquo;
      </p>
    </blockquote>
  );
}

function ComparisonRow({ row }: { row: AnswerComparison }) {
  return (
    <div className="grid grid-cols-2 gap-2 border-t border-[#F0F1F5] py-3">
      <p className={`${eyebrow} col-span-2 flex items-center gap-1.5`}>
        {row.label}
        {row.same && <span className="text-match">· same</span>}
      </p>
      <p className="text-[14px] font-semibold text-ink">{row.mine ?? "—"}</p>
      <p className="text-[14px] font-semibold text-blue">{row.theirs ?? "—"}</p>
    </div>
  );
}
