"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChatBubble } from "@/components/ChatBubble";
import { ProgressBar } from "@/components/ProgressBar";
import { QuickReplyChips } from "@/components/QuickReplyChips";
import { TypingIndicator } from "@/components/TypingIndicator";
import { AnswerInput } from "./AnswerInput";
import { FlatDetailsForm, type FlatDraft } from "./FlatDetailsForm";
import { describeAnswer } from "@/lib/answers";
import type { AnswerValue, Question } from "@/lib/answers";
import { saveFlatDetails, startOver, submitAnswer } from "@/app/app/chat/actions";

const TYPING_MS = 700;

interface Entry {
  id: string;
  from: "bot" | "user";
  text: string;
}

type Stage = "resume" | "typing" | "awaiting" | "flat" | "finishing";

let seq = 0;
const nextId = () => `e${seq++}`;

export function ChatFlow({
  questions,
  areas,
  initialAnswers,
  initialRole,
}: {
  questions: Question[];
  areas: Question["options"];
  initialAnswers: Record<string, AnswerValue>;
  initialRole: "seeker" | "haver" | null;
}) {
  const router = useRouter();

  const answeredKeys = Object.keys(initialAnswers);
  const resuming = answeredKeys.length > 0;

  const [entries, setEntries] = useState<Entry[]>([]);
  const [stage, setStage] = useState<Stage>(resuming ? "resume" : "typing");
  const [cursor, setCursor] = useState(0);
  const [role, setRole] = useState(initialRole);
  const [answered, setAnswered] = useState(answeredKeys.length);
  const [error, setError] = useState<string | null>(null);
  const [flatDone, setFlatDone] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const startedRef = useRef(false);

  const push = useCallback((from: "bot" | "user", text: string) => {
    setEntries((prev) => [...prev, { id: nextId(), from, text }]);
  }, []);

  // Keep the newest message in view, including while the keyboard is open.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [entries, stage]);

  /** Asks question `i`, after a beat of typing. */
  const ask = useCallback(
    (i: number) => {
      const q = questions[i];
      if (!q) {
        setStage("finishing");
        router.push("/app/signup");
        return;
      }
      setStage("typing");
      const timer = setTimeout(() => {
        push("bot", q.helper ? `${q.prompt}\n${q.helper}` : q.prompt);
        setCursor(i);
        setStage("awaiting");
      }, TYPING_MS);
      return () => clearTimeout(timer);
    },
    [questions, push, router],
  );

  // Opening line. Guarded so React's development double-effect does not
  // greet the user twice.
  useEffect(() => {
    if (startedRef.current || resuming) return;
    startedRef.current = true;
    push(
      "bot",
      "Hey! I'm Venn 👋 I'll ask about 10 quick things about how you live, then find people who live the same way.",
    );
    ask(0);
  }, [ask, push, resuming]);

  const handleAnswer = useCallback(
    async (value: AnswerValue) => {
      const q = questions[cursor];
      if (!q) return;

      setError(null);
      setStage("typing");
      push("user", describeAnswer(q, value));

      const result = await submitAnswer(q.key, value);

      if (!result.ok) {
        setError(result.error);
        setStage("awaiting");
        return;
      }

      const nextAnswered = answered + 1;
      setAnswered(nextAnswered);

      const chosenRole =
        q.key === "role" && "choice" in value
          ? (value.choice as "seeker" | "haver")
          : null;
      if (chosenRole) setRole(chosenRole);

      if (result.ack) {
        setTimeout(() => push("bot", result.ack as string), TYPING_MS / 2);
      }

      // Flat owners describe the room before the rest of the questions.
      if (chosenRole === "haver" && !flatDone) {
        setTimeout(() => {
          push(
            "bot",
            "Nice, you're the one everyone wants to meet 😄 Quick details about the room:",
          );
          setStage("flat");
        }, TYPING_MS);
        return;
      }

      setTimeout(() => ask(cursor + 1), TYPING_MS);
    },
    [questions, cursor, answered, flatDone, push, ask],
  );

  const handleFlatDone = useCallback(
    async (draft: FlatDraft) => {
      setStage("typing");
      const res = await saveFlatDetails(draft);
      if (!res.ok) {
        setError(res.error ?? "Couldn't save that.");
        setStage("flat");
        return;
      }
      setFlatDone(true);
      push("user", "Room details added");
      setTimeout(() => ask(cursor + 1), TYPING_MS);
    },
    [cursor, ask, push],
  );

  const resumeChat = useCallback(() => {
    const nextIndex = questions.findIndex((q) => !(q.key in initialAnswers));
    const summary = questions
      .filter((q) => q.key in initialAnswers && q.comparator !== "none")
      .slice(0, 3)
      .map((q) => describeAnswer(q, initialAnswers[q.key]).toLowerCase())
      .join(", ");

    push(
      "bot",
      summary
        ? `Quick recap: ${summary}. Let's keep going.`
        : "Let's keep going.",
    );
    ask(nextIndex === -1 ? questions.length : nextIndex);
  }, [questions, initialAnswers, push, ask]);

  const current = questions[cursor];
  const total = questions.length + (role === "haver" ? 1 : 0);

  return (
    <div className="flex min-h-dvh-safe flex-col bg-canvas">
      <Header current={Math.min(answered + 1, total)} total={total} />

      <div className="scroll-contain flex-1 overflow-y-auto px-5 py-4">
        <div className="flex flex-col gap-2.5">
          {resuming && entries.length === 0 && (
            <p className="py-2 text-center font-mono text-[11px] tracking-[0.12em] text-slate uppercase">
              Today
            </p>
          )}

          {entries.map((e) => (
            <ChatBubble key={e.id} from={e.from}>
              {e.text.split("\n").map((line, i) => (
                <span key={i} className={i > 0 ? "mt-1 block opacity-80" : undefined}>
                  {line}
                </span>
              ))}
            </ChatBubble>
          ))}

          {stage === "typing" && <TypingIndicator />}

          {stage === "resume" && (
            <ChatBubble from="bot">
              Welcome back! You&apos;re {answeredKeys.length} question
              {answeredKeys.length === 1 ? "" : "s"} in. Pick up where we left
              off?
            </ChatBubble>
          )}
        </div>

        {error && (
          <p role="alert" className="mt-3 text-[13px] text-danger">
            {error}
          </p>
        )}

        <div ref={bottomRef} className="h-2" />
      </div>

      <div className="bg-canvas">
        {stage === "resume" && (
          <div className="px-5 pb-4">
            <QuickReplyChips
              options={[
                { value: "continue", label: "Yes, continue" },
                { value: "restart", label: "Start over" },
              ]}
              selected={null}
              onSelect={(v) => {
                if (v === "continue") {
                  resumeChat();
                } else {
                  void startOver().then(() => window.location.reload());
                }
              }}
            />
          </div>
        )}

        {stage === "flat" && (
          <FlatDetailsForm areas={areas} onDone={handleFlatDone} />
        )}

        {stage === "awaiting" && current && (
          <AnswerInput
            key={current.key}
            question={current}
            onAnswer={(v) => void handleAnswer(v)}
          />
        )}
      </div>
    </div>
  );
}

function Header({ current, total }: { current: number; total: number }) {
  return (
    <header className="pt-safe sticky top-0 z-30 border-b border-mist bg-paper px-5 pt-3 pb-3">
      <div className="flex items-center gap-2.5">
        <span
          aria-hidden="true"
          className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-ink text-xs font-bold text-white"
        >
          V
        </span>
        <span className="flex flex-col">
          <span className="font-display text-[17px] font-bold tracking-[-0.03em] text-ink">
            Venn
          </span>
          <span className="text-[12px] text-slate">your flatmate matchmaker</span>
        </span>
      </div>
      <ProgressBar current={current} total={total} className="mt-3" />
    </header>
  );
}
