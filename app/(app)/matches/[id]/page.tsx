import { BgBlobs } from "@/components/BgBlobs";
import { ButtonLink } from "@/components/Button";
import { requireStage } from "@/server/auth";

/**
 * /matches/[id] — the side-by-side detail. PLACEHOLDER.
 *
 * `get_match_detail` already exists and raises for a candidate the viewer has
 * not unlocked, so when this screen is built the entitlement check is the
 * RPC's, not this file's. It does not read the id yet on purpose: showing a
 * candidate's anything before that check is wired would be the one mistake
 * this route cannot make twice.
 *
 * Outside the (tabs) group: the detail screen has its own back affordance and
 * shows no TabBar.
 */
export const instant = false;

export default async function MatchDetailPage() {
  await requireStage("app");

  return (
    <div className="screen-h relative flex flex-col justify-center px-7 py-12">
      <BgBlobs />

      <div className="relative z-10">
        <p className="font-mono text-[11px] tracking-[0.12em] text-indigo uppercase">
          {"// Match detail"}
        </p>
        <h1 className="mt-3 font-display text-[28px] leading-[1.15] font-bold tracking-[-0.03em] text-ink">
          The full side-by-side is next.
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-slate">
          Answer-by-answer comparison, the frictions in full, and sending an
          interest all land here.
        </p>

        <ButtonLink href="/matches" variant="ghost" className="mt-7">
          Back to matches
        </ButtonLink>
      </div>
    </div>
  );
}
