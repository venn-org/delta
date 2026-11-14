import { BgBlobs } from "@/components/BgBlobs";
import { Avatar } from "@/components/Avatar";
import { getProfileSummary } from "@/server/profile";
import { requireStage } from "@/server/auth";
import { signOutAction } from "./actions";
import type { ReactNode } from "react";

/**
 * /profile — the account screen (design_elements/Settings.dc.html).
 *
 * Two kinds of row live here and they are deliberately told apart:
 *
 *   - A row backed by an answer shows that answer and nothing else. "Looking
 *     in" and "Budget" are the `locality` and `budget` answers read back.
 *   - A row whose destination does not exist yet is inert and says "Soon".
 *     The design draws a chevron on every row, but a chevron that navigates
 *     nowhere is a worse answer than a row that admits it is not ready.
 *
 * The design also has "Move-in" and "Show me" rows. There is no move-in
 * question and no gender preference in the eleven seeded questions, so those
 * rows are absent rather than faked — an empty row would imply a setting the
 * user could go and change.
 *
 * Nothing private is read: no phone, no email (§4.1).
 */
export const instant = false;

export default async function ProfilePage() {
  await requireStage("app");

  const summary = await getProfileSummary();

  // requireStage("app") already guarantees an active profile, so this is for
  // the type checker rather than a case that happens.
  if (!summary) return null;

  const { name, age, work, homeArea, isVerified, role, lookingIn, budget } =
    summary;

  const subtitle =
    [work, homeArea].filter(Boolean).join(" · ") ||
    (role === "haver" ? "Has a place" : "Looking for a place");

  return (
    <div className="relative min-h-full bg-canvas">
      <BgBlobs />

      <div className="relative z-10 flex flex-col gap-4 px-gutter pt-4 pb-6">
        <h1 className="mt-2 font-display text-[26px] leading-tight font-bold tracking-[-0.03em] text-ink">
          Profile
        </h1>

        {/* --- Identity ------------------------------------------------- */}
        <section className="venn-rise flex items-center gap-3.5 rounded-card bg-white p-4 shadow-card">
          <Avatar name={name} size="lg" />
          <div className="min-w-0 flex-1">
            <h2 className="flex items-center gap-1.5 truncate font-display text-[20px] leading-tight font-bold tracking-[-0.03em] text-ink">
              {age != null ? `${name}, ${age}` : name}
              {isVerified && <VerifiedBadge />}
            </h2>
            <p className="truncate text-[14px] text-slate">{subtitle}</p>
          </div>
        </section>

        {/* --- What we match you on ------------------------------------- */}
        <Group label="// What we match you on">
          <Row
            label="Looking in"
            value={lookingIn.length > 0 ? lookingIn.join(", ") : null}
          />
          <Row label="Budget" value={budget} />
          <Row label="Your answers" soon />
          <Row label="Get verified" value={isVerified ? "Verified" : null} soon={!isVerified} />
        </Group>

        {/* --- Account -------------------------------------------------- */}
        <Group label="// Account">
          <Row label="Notifications" soon />
          <Row label="Pause my profile" soon />
          <Row label="Privacy & safety" soon />
          <Row label="Help" soon />
        </Group>

        <form action={signOutAction}>
          <button
            type="submit"
            className="w-full cursor-pointer rounded-card bg-white px-4 py-3.5 text-left text-[15px] font-semibold text-danger shadow-card transition-opacity active:opacity-85"
          >
            Sign out
          </button>
        </form>
      </div>
    </div>
  );
}

function VerifiedBadge() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="#335CFF"
      aria-label="Verified"
      role="img"
      className="flex-none"
    >
      <path d="M12 2l2.4 1.8 3-.2.9 2.9 2.5 1.7-1.2 2.8 1.2 2.8-2.5 1.7-.9 2.9-3-.2L12 22l-2.4-1.8-3 .2-.9-2.9L3.2 15.8 4.4 13 3.2 10.2l2.5-1.7.9-2.9 3 .2z" />
      <path d="M10.6 14.6l-2.2-2.2 1.1-1.1 1.1 1.1 3.9-3.9 1.1 1.1z" fill="#fff" />
    </svg>
  );
}

/** A titled white card whose children are hairline-separated rows. */
function Group({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section className="venn-rise flex flex-col gap-2">
      <p className="font-mono text-[11px] tracking-[0.12em] text-slate uppercase">
        {label}
      </p>
      {/* The divider is on each row but the first, so the card edges stay clean. */}
      <div className="overflow-hidden rounded-card bg-white px-4 shadow-card">
        {children}
      </div>
    </section>
  );
}

/**
 * Label on the left, value on the right.
 *
 * `soon` and `value` are not mutually exclusive: "Get verified" shows
 * "Verified" once they are, and is a stub only while they are not.
 */
function Row({
  label,
  value,
  soon = false,
}: {
  label: string;
  value?: string | null;
  soon?: boolean;
}) {
  return (
    <div className="flex min-h-[52px] items-center justify-between gap-3 border-t border-mist/60 py-3.5 first:border-t-0">
      <span className="flex-none text-[15px] text-ink">{label}</span>
      <span className="min-w-0 truncate text-right text-[14px] text-slate">
        {value ?? (soon ? <span className="text-slate/60">Soon</span> : "—")}
      </span>
    </div>
  );
}
