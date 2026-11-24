import "server-only";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { answerSchemas, describeAnswer, type Question } from "@/lib/answers";
import type { AnswerComparison, MatchDetail } from "@/lib/types";
import { loadQuestions } from "@/server/onboarding";
import { toTags } from "./list";

/**
 * The full side-by-side for one candidate.
 *
 * The entitlement check is `get_match_detail`'s, not this file's: it raises
 * `payment_required` for a candidate ranked below the free tier unless the
 * viewer has paid, and `match_not_found` for anyone who is not in the
 * viewer's results or is hidden by a block. This function only translates
 * those refusals into outcomes a page can route on.
 */
export type MatchDetailResult =
  | { status: "ok"; match: MatchDetail }
  | { status: "locked" }
  | { status: "not_found" };

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Short row labels for the comparison, by question key. The prompt is the
 * fallback, so a question added later still renders — just with its full
 * wording until it gets a label here.
 */
const ROW_LABELS: Record<string, string> = {
  sleep: "Sleep",
  cleanliness: "Cleanliness",
  guests: "Guests",
  cooking: "Cooking",
  smoking_drinking: "Smoking / drinking",
  work: "Work",
  budget: "Budget",
  locality: "Areas",
  city: "City",
  pets: "Pets",
};

/** Not comparisons: `role` is shown elsewhere, free text gets a quote block. */
const SKIPPED_KEYS = new Set(["role"]);

const detailSchema = z.object({
  score: z.number(),
  rank: z.number(),
  reasons: z.unknown(),
  frictions: z.unknown(),
  profile: z.object({
    id: z.string(),
    displayName: z.string().nullable(),
    age: z.number().nullable(),
    occupation: z.string().nullable(),
    employer: z.string().nullable(),
    avatarPath: z.string().nullable(),
    idealSunday: z.string().nullable(),
    petPeeve: z.string().nullable(),
    isVerified: z.boolean().nullable(),
    areaName: z.string().nullable(),
  }),
  answers: z.array(
    z.object({
      key: z.string(),
      prompt: z.string(),
      mine: z.unknown(),
      theirs: z.unknown(),
      same: z.boolean().nullable(),
    }),
  ),
});

/** A stored answer as its display label, or null if absent or malformed. */
function label(question: Question | undefined, value: unknown): string | null {
  if (!question || value == null) return null;
  const parsed = answerSchemas[question.answerKind].safeParse(value);
  if (!parsed.success) return null;
  return describeAnswer(question, parsed.data) || null;
}

export async function getMatchDetail(
  candidateId: string,
): Promise<MatchDetailResult> {
  // Postgres would reject a malformed id with a cast error; to the visitor
  // that is simply a match that does not exist.
  if (!UUID.test(candidateId)) return { status: "not_found" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: "not_found" };

  const [detail, questions, interest] = await Promise.all([
    supabase.rpc("get_match_detail", { p_candidate: candidateId }),
    loadQuestions(),
    supabase
      .from("interests")
      .select("status")
      .eq("from_user", user.id)
      .eq("to_user", candidateId)
      .maybeSingle(),
  ]);

  if (detail.error) {
    if (detail.error.code === "P0003") return { status: "locked" };
    if (detail.error.code === "P0002") return { status: "not_found" };
    throw new Error(`get_match_detail: ${detail.error.message}`);
  }

  const parsed = detailSchema.safeParse(detail.data);
  if (!parsed.success) {
    throw new Error(`get_match_detail: unexpected shape: ${parsed.error.message}`);
  }
  const { score, rank, frictions, profile, answers } = parsed.data;

  const byKey = new Map(questions.map((q) => [q.key, q]));

  const theirPetPeeve = answers.find((a) => a.key === "pet_peeve")?.theirs;

  const comparisons: AnswerComparison[] = answers.flatMap((row) => {
    const question = byKey.get(row.key);
    if (SKIPPED_KEYS.has(row.key) || question?.answerKind === "free_text") {
      return [];
    }
    const mine = label(question, row.mine);
    const theirs = label(question, row.theirs);
    if (mine === null && theirs === null) return [];
    return [
      {
        key: row.key,
        label: ROW_LABELS[row.key] ?? row.prompt,
        mine,
        theirs,
        same: row.same === true,
      },
    ];
  });

  const status = interest.data?.status;

  return {
    status: "ok",
    match: {
      candidateId: profile.id,
      score,
      rank,
      displayName: profile.displayName,
      age: profile.age,
      occupation: profile.occupation,
      employer: profile.employer,
      areaName: profile.areaName,
      // Same as the list: there is no avatars bucket to sign against yet.
      avatarUrl: null,
      isVerified: profile.isVerified === true,
      idealSunday: profile.idealSunday,
      petPeeve:
        profile.petPeeve ??
        label(byKey.get("pet_peeve"), theirPetPeeve),
      frictions: toTags(frictions),
      answers: comparisons,
      hiSent: status === "pending" || status === "accepted",
    },
  };
}

export type SayHiResult = { ok: true } | { ok: false; error: string };

/**
 * Sends an interest. `send_interest` re-checks visibility, the free-tier
 * entitlement and a 20-a-day rate limit, so this is safe to call with any id
 * a client sends.
 */
export async function sayHi(candidateId: string): Promise<SayHiResult> {
  if (!UUID.test(candidateId)) {
    return { ok: false, error: "That match no longer exists." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("send_interest", { p_to: candidateId });
  if (!error) return { ok: true };

  switch (error.code) {
    case "P0004":
      return { ok: false, error: "You've said hi a lot today. Try again tomorrow." };
    case "P0003":
      return { ok: false, error: "Unlock your matches to say hi to this person." };
    case "P0002":
      return { ok: false, error: "That match no longer exists." };
    case "42501":
      return { ok: false, error: "Your session ended. Sign in again." };
    default:
      return { ok: false, error: "Couldn't send that. Try again." };
  }
}
