"use client";

import { useState } from "react";
import { Button } from "@/components/Button";
import { ChatComposer } from "@/components/ChatComposer";
import { QuickReplyChips } from "@/components/QuickReplyChips";
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
  const [min, setMin] = useState("");
  const [max, setMax] = useState("");

  const minNum = Number(min);
  const maxNum = Number(max);
  const valid =
    min !== "" && max !== "" && Number.isFinite(minNum) && Number.isFinite(maxNum) && maxNum >= minNum;

  return (
    <div className="flex flex-col gap-3 px-5 pb-4">
      <div className="flex items-center gap-2">
        <RupeeField
          label="From"
          value={min}
          onChange={setMin}
          placeholder={question.placeholder ?? "18000"}
          disabled={disabled}
        />
        <span className="pt-5 text-slate">–</span>
        <RupeeField
          label="Up to"
          value={max}
          onChange={setMax}
          placeholder="22000"
          disabled={disabled}
        />
      </div>
      {min !== "" && max !== "" && !valid && (
        <p className="text-[13px] text-danger">
          The second figure needs to be the larger one.
        </p>
      )}
      <Button
        block
        disabled={disabled || !valid}
        onClick={() => onAnswer({ min: Math.round(minNum), max: Math.round(maxNum) })}
      >
        That&apos;s my range
      </Button>
    </div>
  );
}

function RupeeField({
  label,
  value,
  onChange,
  placeholder,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  disabled?: boolean;
}) {
  return (
    <label className="flex flex-1 flex-col gap-1">
      <span className="font-mono text-[11px] tracking-[0.12em] text-slate uppercase">
        {label}
      </span>
      <span className="flex items-center gap-1 rounded-field border-[1.5px] border-mist bg-white px-3 focus-within:border-blue">
        <span className="text-slate">₹</span>
        <input
          // `inputMode` gives phones the numeric keypad without the spinner
          // and scroll-to-change behaviour of type="number".
          inputMode="numeric"
          pattern="[0-9]*"
          value={value}
          disabled={disabled}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value.replace(/[^0-9]/g, ""))}
          className="w-full bg-transparent py-2.5 text-ink outline-none placeholder:text-slate/60"
        />
      </span>
    </label>
  );
}
