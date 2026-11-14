import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { MatchListItem, ReasonTag } from "@/lib/types";

/**
 * The match list, exactly as the database chose to reveal it.
 *
 * Every redaction decision is made in SQL by `get_match_list` — for a locked
 * match the name, age, occupation and avatar come back as NULL and `reasons`
 * is trimmed to one tag (docs/ARCHITECTURE.md §6.1). This function therefore
 * does no filtering of its own: there is deliberately no `if (isLocked)`
 * anywhere below, because the hidden fields never arrived. Adding one here
 * would create a second, weaker copy of the rule that could drift from the
 * real one.
 */

/** `reasons` and `frictions` arrive as jsonb, so they are `unknown` to us. */
function toTags(value: unknown): ReasonTag[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];
    const { key, label } = entry as Record<string, unknown>;
    if (typeof key !== "string" || typeof label !== "string") return [];
    return [{ key, label }];
  });
}

export async function getMatchList(): Promise<MatchListItem[]> {
  const supabase = await createClient();

  // No viewer argument: the RPC defaults to auth.uid() and refuses any other
  // value, so a caller cannot ask for somebody else's list.
  const { data, error } = await supabase.rpc("get_match_list");
  if (error) throw new Error(`get_match_list: ${error.message}`);

  return (data ?? []).map((row) => ({
    candidateId: row.candidate_id,
    rank: row.rank,
    score: row.score,
    isLocked: row.is_locked,
    areaName: row.area_name,
    displayName: row.display_name,
    age: row.age,
    occupation: row.occupation,
    // A path, not a URL. Signed URLs are minted server-side after a
    // visibility check, and the avatars bucket does not exist yet — so there
    // is nothing to sign and this stays null until photo upload lands.
    avatarUrl: null,
    reasons: toTags(row.reasons),
    frictions: toTags(row.frictions),
    isVerified: row.is_verified,
  }));
}

/** Whether this viewer has paid to see the whole list. */
export async function hasUnlockedAll(): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { data, error } = await supabase.rpc("has_entitlement", {
    p_user: user.id,
    p_kind: "unlock_all",
  });
  // Treat an error as "not entitled": failing closed costs a user one upsell
  // banner, while failing open gives away the thing being sold.
  if (error) return false;
  return data === true;
}
