import { z } from "zod";

/** Mirrors the `answer_kind` enum in migration 0001. */
export type AnswerKind =
  | "single_choice"
  | "multi_choice"
  | "scale"
  | "range"
  | "free_text"
  | "area_multi";

export type Comparator =
  | "exact"
  | "ordinal"
  | "range_overlap"
  | "set_overlap"
  | "none";

export interface QuestionOption {
  value: string;
  label: string;
  emoji?: string;
  helper?: string;
  ordinal?: number;
}

/**
 * A question as the chat needs it. Assembled in server/onboarding/questions.ts
 * from the `questions` table — for `area_multi`, `options` is filled from the
 * live rows in `areas` rather than from the question itself.
 */
export interface Question {
  key: string;
  sortOrder: number;
  prompt: string;
  helper: string | null;
  ack: string | null;
  placeholder: string | null;
  answerKind: AnswerKind;
  comparator: Comparator;
  options: QuestionOption[];
  ordinalMin: number | null;
  ordinalMax: number | null;
  askedOf: string[];
}

/**
 * Stored answer shapes. These are what `answers.value` holds, and what the
 * SQL scorer reads in venn_similarity() — changing one means changing both.
 */
export const answerSchemas = {
  single_choice: z.object({ choice: z.string().min(1) }),
  multi_choice: z.object({ choices: z.array(z.string().min(1)).min(1) }),
  scale: z.object({ value: z.number().int() }),
  range: z.object({ min: z.number().int().min(0), max: z.number().int().min(0) }),
  free_text: z.object({ text: z.string().trim().min(1).max(500) }),
  area_multi: z.object({ areas: z.array(z.string().min(1)).min(1) }),
} as const;

export type AnswerValue =
  | { choice: string }
  | { choices: string[] }
  | { value: number }
  | { min: number; max: number }
  | { text: string }
  | { areas: string[] };

export type ValidationResult =
  | { ok: true; value: AnswerValue }
  | { ok: false; error: string };

/**
 * Validates a raw answer against its question.
 *
 * Runs on the SERVER on every write. Choice values are checked against
 * `questions.options`, so a client cannot invent a value the scorer has never
 * seen — a hard requirement of §7.1.
 */
export function validateAnswer(
  question: Question,
  raw: unknown,
): ValidationResult {
  const schema = answerSchemas[question.answerKind];
  const parsed = schema.safeParse(raw);

  if (!parsed.success) {
    return { ok: false, error: "That answer isn't in the right shape." };
  }

  const value = parsed.data as AnswerValue;
  const allowed = new Set(question.options.map((o) => o.value));

  switch (question.answerKind) {
    case "single_choice": {
      const { choice } = value as { choice: string };
      if (!allowed.has(choice)) {
        return { ok: false, error: "That isn't one of the options." };
      }
      break;
    }

    case "multi_choice":
    case "area_multi": {
      const picked =
        "choices" in value ? value.choices : (value as { areas: string[] }).areas;
      if (picked.some((v) => !allowed.has(v))) {
        return { ok: false, error: "That isn't one of the options." };
      }
      break;
    }

    case "scale": {
      const { value: n } = value as { value: number };
      const min = question.ordinalMin ?? 1;
      const max = question.ordinalMax ?? 5;
      if (n < min || n > max) {
        return { ok: false, error: `Pick a number between ${min} and ${max}.` };
      }
      break;
    }

    case "range": {
      const { min, max } = value as { min: number; max: number };
      if (max < min) {
        return { ok: false, error: "The upper figure has to be the larger one." };
      }
      // A sanity ceiling, not a product rule: it catches a stray zero far more
      // often than it catches a real Mumbai rent.
      if (max > 10_000_000) {
        return { ok: false, error: "That looks like a typo." };
      }
      break;
    }

    case "free_text":
      break;
  }

  return { ok: true, value };
}

/** Label for a stored answer, used for the user's chat bubble. */
export function describeAnswer(question: Question, value: AnswerValue): string {
  const labelOf = (v: string) =>
    question.options.find((o) => o.value === v)?.label ?? v;

  if ("choice" in value) return labelOf(value.choice);
  if ("choices" in value) return value.choices.map(labelOf).join(", ");
  if ("areas" in value) return value.areas.map(labelOf).join(", ");
  if ("text" in value) return value.text;
  if ("min" in value) {
    return `₹${(value.min / 1000).toFixed(0)}–${(value.max / 1000).toFixed(0)}k`;
  }
  if ("value" in value) {
    const opt = question.options.find((o) => o.ordinal === value.value);
    return opt ? `${opt.label}, ${value.value}/5` : `${value.value}/5`;
  }
  return "";
}
