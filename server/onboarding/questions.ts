import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Question, QuestionOption } from "@/lib/answers";

/** Scale questions render 1–5 with these rungs. */
const SCALE_LABELS = ["Messy", "Chill", "Fine", "Pretty tidy", "Spotless"];

/**
 * Loads the live question set for the onboarding chat.
 *
 * Read with the user-scoped client: `questions` and `areas` both grant SELECT
 * to `anon`, which is what the chat runs as before signup (§6.5).
 *
 * `area_multi` questions carry no options of their own — the choices are the
 * live coverage areas, so launching a new neighbourhood is an UPDATE to
 * `areas.is_live` and nothing else (§4.4).
 */
export async function loadQuestions(): Promise<Question[]> {
  const supabase = await createClient();

  const [{ data: rows, error }, { data: areas }] = await Promise.all([
    supabase
      .from("questions")
      .select(
        "key, sort_order, prompt, helper, ack, placeholder, answer_kind, comparator, options, ordinal_min, ordinal_max, asked_of",
      )
      .eq("is_active", true)
      .order("sort_order"),
    supabase
      .from("areas")
      .select("slug, name")
      .eq("is_live", true)
      .order("name"),
  ]);

  if (error) throw new Error(`Could not load questions: ${error.message}`);
  if (!rows) return [];

  const areaOptions: QuestionOption[] = (areas ?? []).map((a) => ({
    value: a.slug,
    label: a.name,
  }));

  return rows.map((row) => {
    let options: QuestionOption[];

    if (row.answer_kind === "area_multi") {
      options = areaOptions;
    } else if (row.answer_kind === "scale") {
      const min = Number(row.ordinal_min ?? 1);
      const max = Number(row.ordinal_max ?? 5);
      options = Array.from({ length: max - min + 1 }, (_, i) => ({
        value: String(min + i),
        label: SCALE_LABELS[i] ?? String(min + i),
        ordinal: min + i,
      }));
    } else {
      options = ((row.options as QuestionOption[] | null) ?? []).map((o) => ({
        value: o.value,
        label: o.label,
        emoji: o.emoji,
        helper: o.helper,
        ordinal: o.ordinal,
      }));
    }

    return {
      key: row.key,
      sortOrder: row.sort_order,
      prompt: row.prompt,
      helper: row.helper,
      ack: row.ack,
      placeholder: row.placeholder,
      answerKind: row.answer_kind,
      comparator: row.comparator,
      options,
      ordinalMin: row.ordinal_min === null ? null : Number(row.ordinal_min),
      ordinalMax: row.ordinal_max === null ? null : Number(row.ordinal_max),
      askedOf: row.asked_of ?? ["seeker", "haver"],
    } satisfies Question;
  });
}

/**
 * The questions actually asked of this user.
 *
 * `role` is answered first and decides the rest: a flat owner gets the
 * Flat-details step, a seeker does not.
 */
export function questionsForRole(
  all: Question[],
  role: "seeker" | "haver" | null,
): Question[] {
  if (!role) return all.filter((q) => q.key === "role");
  return all.filter((q) => q.key === "role" || q.askedOf.includes(role));
}
