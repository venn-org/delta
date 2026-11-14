import Link from "next/link";
import { Avatar } from "./Avatar";
import { MatchPill } from "./MatchPill";
import { Tag } from "./Tag";
import { cn } from "@/lib/cn";
import type { MatchListItem } from "@/lib/types";

function VerifiedBadge() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="#335CFF" aria-label="Verified" role="img">
      <path d="M12 2l2.4 1.8 3-.2.9 2.9 2.5 1.7-1.2 2.8 1.2 2.8-2.5 1.7-.9 2.9-3-.2L12 22l-2.4-1.8-3 .2-.9-2.9L3.2 15.8 4.4 13 3.2 10.2l2.5-1.7.9-2.9 3 .2z" />
      <path d="M10.6 14.6l-2.2-2.2 1.1-1.1 1.1 1.1 3.9-3.9 1.1 1.1z" fill="#fff" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="4" y="10" width="16" height="10" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

/**
 * Match card, locked and unlocked.
 *
 * The locked variant is NOT the unlocked one with a blur on top. The server
 * never sends a name, a photo URL or a second reason tag for a locked match
 * (docs/ARCHITECTURE.md §6.1), so this renders a placeholder because there is
 * genuinely nothing to show. Reading the DOM reveals nothing.
 */
export function MatchCard({ match }: { match: MatchListItem }) {
  const {
    candidateId,
    score,
    isLocked,
    areaName,
    displayName,
    age,
    occupation,
    avatarUrl,
    reasons,
    isVerified,
  } = match;

  const body = (
    <>
      <div className="flex items-center gap-3">
        <Avatar name={displayName} src={avatarUrl} size="lg" />

        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          {isLocked ? (
            <>
              {/* A neutral bar, not obscured text — no name was ever sent. */}
              <span
                aria-hidden="true"
                className="h-[15px] w-28 rounded-pill bg-mist"
              />
              <span className="mt-1 text-[13px] text-slate">
                {areaName ?? "Nearby"}
              </span>
            </>
          ) : (
            <>
              <span className="flex items-center gap-1.5 truncate text-[17px] font-bold text-ink">
                {displayName}
                {age != null && `, ${age}`}
                {isVerified && <VerifiedBadge />}
              </span>
              <span className="truncate text-[13px] text-slate">
                {[occupation, areaName].filter(Boolean).join(" · ")}
              </span>
            </>
          )}
        </div>

        <MatchPill score={score} />
      </div>

      {reasons.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {reasons.map((reason) => (
            <Tag key={reason.key} kind="match">
              {reason.label}
            </Tag>
          ))}
        </div>
      )}

      {isLocked && (
        <p className="mt-3 flex items-center gap-1.5 text-[13px] font-semibold text-blue">
          <LockIcon />
          Unlock to see who this is
        </p>
      )}
    </>
  );

  const classes = cn(
    "block rounded-card bg-white p-4 no-underline shadow-card",
    "transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-lift",
  );

  // A locked card links to the paywall, never to the detail route — which
  // would 403 anyway, since the server re-checks the entitlement there.
  return (
    <article className="venn-rise">
      <Link
        href={isLocked ? "/unlock" : `/matches/${candidateId}`}
        className={classes}
      >
        {body}
      </Link>
    </article>
  );
}
