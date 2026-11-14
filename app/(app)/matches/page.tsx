import { redirect } from "next/navigation";
import { BgBlobs } from "@/components/BgBlobs";
import { VennMark } from "@/components/VennMark";
import { createClient } from "@/lib/supabase/server";

/**
 * /matches — Results-locked / Results-mobile / No-matches. PLACEHOLDER.
 *
 * Phase 4 builds the real screen, together with the free-tier redaction that
 * must happen server-side: a locked match's response body may contain no
 * name, no photo path and no second reason tag (§6.1).
 *
 * It exists now because it is where a signed-in user lands, and this slice
 * ends with signed-in users. The guard is the real one, not a placeholder.
 */
export const instant = false;

export default async function MatchesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/signin");

  const { count } = await supabase
    .from("match_results")
    .select("candidate_id", { count: "exact", head: true });

  return (
    <div className="screen-h relative flex flex-col justify-center px-7 py-12">
      <BgBlobs />

      <div className="relative z-10">
        <VennMark size={40} />

        <p className="mt-6 font-mono text-[11px] tracking-[0.12em] text-indigo uppercase">
          {/* eslint-disable-next-line react/jsx-no-comment-textnodes */}
          // You&apos;re in
        </p>

        <h1 className="mt-3 font-display text-[28px] leading-[1.15] font-bold tracking-[-0.03em] text-ink">
          Your answers are saved.
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-slate">
          {count && count > 0
            ? `We've found ${count} ${count === 1 ? "person" : "people"} worth looking at. The match list itself is the next thing being built.`
            : "The match list is the next thing being built."}
        </p>
      </div>
    </div>
  );
}
