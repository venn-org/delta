/**
 * Shapes returned by the database. These mirror the RPC signatures in
 * docs/ARCHITECTURE.md §6.1 — keep them in sync with the migrations.
 */

export interface ReasonTag {
  key: string;
  label: string;
}

/**
 * One row from `get_match_list(p_viewer)`.
 *
 * The nullable fields are the free-tier gate, enforced in SQL. For a locked
 * match the server returns NULL for name, age, occupation and avatar, and
 * trims `reasons` to a single tag. The client never receives the hidden data,
 * so there is nothing here to accidentally render.
 */
export interface MatchListItem {
  candidateId: string;
  rank: number;
  score: number;
  isLocked: boolean;
  areaName: string | null;

  displayName: string | null;
  age: number | null;
  occupation: string | null;
  avatarUrl: string | null;

  reasons: ReasonTag[];
  frictions: ReasonTag[];
  isVerified: boolean;
}
