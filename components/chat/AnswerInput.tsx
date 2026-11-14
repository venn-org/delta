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
 */
export function AnswerInput({
  question,
  onAnswer,
  disabled,
}: {
  question: Question;
  onAnswer: (value: AnswerValue) => void;
  disabled?: boolean;
}) {
  switch (question.answerKind) {
    case "single_choice":
      return <SingleChoice question={question} onAnswer={onAnswer} disabled={disabled} />;
    case "multi_choice":
    case "area_multi":
      return <MultiChoice question={question} onAnswer={onAnswer} disabled={disabled} />;
    case "scale":
      return <ScaleAnswer question={question} onAnswer={onAnswer} disabled={disabled} />;
    case "range":
      return <RangeAnswer question={question} onAnswer={onAnswer} disabled={disabled} />;
    case "free_text":
      return (
        <ChatComposer
          disabled={disabled}
          placeholder={question.placeholder ?? "Message"}
          onSend={(text) => onAnswer({ text })}
        />
      );
  }
}

function SingleChoice({
  question,
  onAnswer,
  disabled,
}: {
  question: Question;
  onAnswer: (v: AnswerValue) => void;
  disabled?: boolean;
}) {
  const [picked, setPicked] = useState<string | null>(null);

  return (
    <div className="px-5 pb-4">
      <QuickReplyChips
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
}: {
  question: Question;
  onAnswer: (v: AnswerValue) => void;
  disabled?: boolean;
}) {
  const [picked, setPicked] = useState<string[]>([]);
  const isAreas = question.answerKind === "area_multi";

  return (
    <div className="flex flex-col gap-3 px-5 pb-4">
      <QuickReplyChips
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
        block
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
}: {
  question: Question;
  onAnswer: (v: AnswerValue) => void;
  disabled?: boolean;
}) {
  const min = question.ordinalMin ?? 1;
  const max = question.ordinalMax ?? 5;
  const [value, setValue] = useState(Math.round((min + max) / 2));

  const labelFor = (n: number) =>
    question.options.find((o) => o.ordinal === n)?.label ?? String(n);

  return (
    <div className="flex flex-col gap-3 px-5 pb-4">
      <ScaleSlider
        label={question.prompt.slice(0, 28)}
        value={value}
        onChange={setValue}
        min={min}
        max={max}
        endLabels={[labelFor(min), labelFor(max)]}
        valueLabel={labelFor(value)}
      />
      <Button block disabled={disabled} onClick={() => onAnswer({ value })}>
        That&apos;s me
      </Button>
    </div>
  );
}

function RangeAnswer({
  question,
  onAnswer,
  disabled,
}: {
  question: Question;
  onAnswer: (v: AnswerValue) => void;
  disabled?: boolean;
}) {
  // End stops come from the question row, not constants here (migration 0012).
  const min = question.ordinalMin ?? 5000;
  const max = question.ordinalMax ?? 50000;
  const step = 1000;

  // Opens on a sensible middle band rather than the full range, so the
  // answer reflects a choice instead of the default.
  const [range, setRange] = useState({
    min: Math.round((min + (max - min) * 0.25) / step) * step,
    max: Math.round((min + (max - min) * 0.5) / step) * step,
  });

  return (
    <div className="flex flex-col gap-3 px-5 pb-4">
      <RangeSlider
        min={min}
        max={max}
        step={step}
        valueMin={range.min}
        valueMax={range.max}
        onChange={setRange}
        disabled={disabled}
      />
      <Button block disabled={disabled} onClick={() => onAnswer(range)}>
        That&apos;s my range
      </Button>
    </div>
  );
}
