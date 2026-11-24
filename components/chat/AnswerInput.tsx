"use client";

import { useState } from "react";
import { Button } from "@/components/Button";
import { ChatComposer } from "@/components/ChatComposer";
import { QuickReplyChips } from "@/components/QuickReplyChips";
import { RangeSlider } from "@/components/RangeSlider";
import { ScaleSlider } from "@/components/ScaleSlider";
import type { AnswerValue, Question } from "@/lib/answers";

/**
 * Renders the control a question needs, chosen by `answer_kind`.
 *
 * Nothing here names a specific question — add a question to the database and
 * it gets the right input automatically (ADR-009).
 *
 * `initial` opens the control on an existing answer — the profile's edit
 * screen passes the current one; the onboarding chat passes nothing.
 */
export function AnswerInput({
  question,
  onAnswer,
  disabled,
  initial,
}: {
  question: Question;
  onAnswer: (value: AnswerValue) => void;
  disabled?: boolean;
  initial?: AnswerValue | null;
}) {
  switch (question.answerKind) {
    case "single_choice":
      return <SingleChoice question={question} onAnswer={onAnswer} disabled={disabled} initial={initial} />;
    case "multi_choice":
    case "area_multi":
      return <MultiChoice question={question} onAnswer={onAnswer} disabled={disabled} initial={initial} />;
    case "scale":
      return <ScaleAnswer question={question} onAnswer={onAnswer} disabled={disabled} initial={initial} />;
    case "range":
      return <RangeAnswer question={question} onAnswer={onAnswer} disabled={disabled} initial={initial} />;
    case "free_text":
      return (
        <ChatComposer
          disabled={disabled}
          placeholder={question.placeholder ?? "Message"}
          initialValue={initial && "text" in initial ? initial.text : ""}
          onSend={(text) => onAnswer({ text })}
        />
      );
  }
}

function SingleChoice({
  question,
  onAnswer,
  disabled,
  initial,
}: {
  question: Question;
  onAnswer: (v: AnswerValue) => void;
  disabled?: boolean;
  initial?: AnswerValue | null;
}) {
  const [picked, setPicked] = useState<string | null>(
    initial && "choice" in initial ? initial.choice : null,
  );

  return (
    <div className="pt-1 pb-1">
      <QuickReplyChips
        className="justify-end"
        options={question.options}
        selected={picked}
        disabled={disabled}
        onSelect={(value) => {
          // Shows the selection for a beat before the bubble appears, so the
          // tap is acknowledged rather than the chips just vanishing.
          setPicked(value);
          setTimeout(() => onAnswer({ choice: value }), 160);
        }}
      />
    </div>
  );
}

function MultiChoice({
  question,
  onAnswer,
  disabled,
  initial,
}: {
  question: Question;
  onAnswer: (v: AnswerValue) => void;
  disabled?: boolean;
  initial?: AnswerValue | null;
}) {
  const [picked, setPicked] = useState<string[]>(
    initial && "choices" in initial
      ? initial.choices
      : initial && "areas" in initial
        ? initial.areas
        : [],
  );
  const isAreas = question.answerKind === "area_multi";

  return (
    <div className="flex flex-col items-end gap-2.5 pt-1 pb-1">
      <QuickReplyChips
        className="justify-end"
        multi
        options={question.options}
        selected={picked}
        disabled={disabled}
        onSelect={(value) =>
          setPicked((prev) =>
            prev.includes(value)
              ? prev.filter((v) => v !== value)
              : [...prev, value],
          )
        }
      />
      <Button
        disabled={disabled || picked.length === 0}
        onClick={() =>
          onAnswer(isAreas ? { areas: picked } : { choices: picked })
        }
      >
        {picked.length === 0
          ? "Pick at least one"
          : `Continue with ${picked.length}`}
      </Button>
    </div>
  );
}

function ScaleAnswer({
  question,
  onAnswer,
  disabled,
  initial,
}: {
  question: Question;
  onAnswer: (v: AnswerValue) => void;
  disabled?: boolean;
  initial?: AnswerValue | null;
}) {
  const min = question.ordinalMin ?? 1;
  const max = question.ordinalMax ?? 5;
  const [value, setValue] = useState(
    initial && "value" in initial ? initial.value : Math.round((min + max) / 2),
  );

  const labelFor = (n: number) =>
    question.options.find((o) => o.ordinal === n)?.label ?? String(n);

  return (
    // Sliders need real width to be usable, so they cannot shrink-wrap to the
    // right like a chip. They sit in a right-aligned card the width of a long
    // bubble instead, which keeps them on the user's side of the thread.
    <div className="ml-auto flex w-[86%] max-w-[300px] flex-col gap-3 rounded-2xl border border-mist bg-white p-3.5">
      <ScaleSlider
        label={question.prompt.slice(0, 28)}
        value={value}
        onChange={setValue}
        min={min}
        max={max}
        endLabels={[labelFor(min), labelFor(max)]}
        valueLabel={labelFor(value)}
      />
      <Button className="self-end" disabled={disabled} onClick={() => onAnswer({ value })}>
        That&apos;s me
      </Button>
    </div>
  );
}

function RangeAnswer({
  question,
  onAnswer,
  disabled,
  initial,
}: {
  question: Question;
  onAnswer: (v: AnswerValue) => void;
  disabled?: boolean;
  initial?: AnswerValue | null;
}) {
  // End stops come from the question row, not constants here (migration 0012).
  const min = question.ordinalMin ?? 5000;
  const max = question.ordinalMax ?? 50000;
  const step = 1000;

  // Opens on a sensible middle band rather than the full range, so the
  // answer reflects a choice instead of the default.
  const [range, setRange] = useState(
    initial && "min" in initial
      ? { min: initial.min, max: initial.max }
      : {
          min: Math.round((min + (max - min) * 0.25) / step) * step,
          max: Math.round((min + (max - min) * 0.5) / step) * step,
        },
  );

  return (
    <div className="ml-auto flex w-[86%] max-w-[300px] flex-col gap-3 rounded-2xl border border-mist bg-white p-3.5">
      <RangeSlider
        min={min}
        max={max}
        step={step}
        valueMin={range.min}
        valueMax={range.max}
        onChange={setRange}
        disabled={disabled}
      />
      <Button className="self-end" disabled={disabled} onClick={() => onAnswer(range)}>
        That&apos;s my range
      </Button>
    </div>
  );
}
