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

/** One question, both people's answers, already turned into display labels. */
export interface AnswerComparison {
  key: string;
  label: string;
  mine: string | null;
  theirs: string | null;
  /** The scorer's verdict (similarity >= 0.85), not a string comparison. */
  same: boolean;
}

/**
 * The side-by-side from `get_match_detail`. Only ever built for a candidate
 * the viewer may see in full: the RPC raises before returning anything for a
 * locked one, so there is no redacted variant of this type.
 */
export interface MatchDetail {
  candidateId: string;
  score: number;
  rank: number;
  displayName: string | null;
  age: number | null;
  occupation: string | null;
  employer: string | null;
  areaName: string | null;
  avatarUrl: string | null;
  isVerified: boolean;
  idealSunday: string | null;
  petPeeve: string | null;
  frictions: ReasonTag[];
  answers: AnswerComparison[];
  /** An interest from the viewer to this person is pending or accepted. */
  hiSent: boolean;
}
