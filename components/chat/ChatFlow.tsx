"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChatBubble } from "@/components/ChatBubble";
import { ProgressBar } from "@/components/ProgressBar";
import { QuickReplyChips } from "@/components/QuickReplyChips";
import { TypingIndicator } from "@/components/TypingIndicator";
import { VennMark } from "@/components/VennMark";
import { FindingScreen } from "@/components/FindingScreen";
import { AnswerInput } from "./AnswerInput";
import { FlatDetailsForm, type FlatDraft } from "./FlatDetailsForm";
import { describeAnswer } from "@/lib/answers";
import type { AnswerValue, Question } from "@/lib/answers";
import {
  finishOnboarding,
  saveFlatDetails,
  startOver,
  submitAnswer,
} from "@/app/(app)/onboarding/chat/actions";

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
  // Drives the second line of the finding screen from "working" to "done".
  const [wrapUpDone, setWrapUpDone] = useState(false);
  // Starts the fade on the way out, so the screen does not just vanish.
  const [leaving, setLeaving] = useState(false);

  const scrollerRef = useRef<HTMLDivElement>(null);
  const stickRef = useRef(true);
  const startedRef = useRef(false);

  const push = useCallback((from: "bot" | "user", text: string) => {
    setEntries((prev) => [...prev, { id: nextId(), from, text }]);
  }, []);

  /**
   * Pins the thread to the bottom.
   *
   * Two frames of delay, not one: the first lets React commit the new
   * bubble, the second lets layout settle (the answer controls below the
   * thread change height as the question changes). Scrolling on the same
   * frame as the push lands short, which is why the last reply was always
   * half off-screen.
   */
  const scrollToBottom = useCallback((smooth = true) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const el = scrollerRef.current;
        if (!el) return;
        el.scrollTo({ top: el.scrollHeight, behavior: smooth ? "smooth" : "auto" });
      });
    });
  }, []);

  useEffect(() => {
    if (stickRef.current) scrollToBottom();
  }, [entries, stage, scrollToBottom]);

  // The controls under the thread resize when the question changes, which
  // moves the bottom. Follow it.
  useEffect(() => {
    const el = scrollerRef.current;
    const content = el?.firstElementChild;
    if (!el || !content || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => {
      if (stickRef.current) scrollToBottom(false);
    });
    ro.observe(content);
    return () => ro.disconnect();
  }, [scrollToBottom]);

  /** Asks question `i`, after a beat of typing. */
  const ask = useCallback(
    (i: number) => {
      const q = questions[i];
      if (!q) {
        // Don't snap from the last answer straight into a form. The finding
        // screen covers the beat, and the prefetch below means the handoff is
        // a deliberate pause rather than a wait on the network.
        setStage("finishing");
        router.prefetch("/signin");
        router.prefetch("/finding");
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

  /**
   * The handoff to /signin.
   *
   * Long enough to register as a step of its own and short enough not to feel
   * like a stall — the second line flips to done partway through, so the
   * screen is doing something rather than just sitting there.
   *
   * It is a fixed pause, not a progress bar: nothing slow is actually
   * happening here. The real wait is after signup, when the claim runs
   * compute_matches_for inline, and that is what the /finding route covers.
   */
  useEffect(() => {
    if (stage !== "finishing") return;

    // Paced so each beat is legible: the screen settles, the second line
    // lands, it holds long enough to actually be read, then fades. Two
    // seconds end to end was fast enough to register as a flicker.
    // Where this goes depends on whether they are already signed in, which
    // only the server knows. Asked for immediately so the answer is waiting
    // by the time the screen has played out.
    const destination = finishOnboarding();

    const flip = setTimeout(() => setWrapUpDone(true), 1600);
    const fade = setTimeout(() => setLeaving(true), 3800);
    const go = setTimeout(async () => {
      router.push(await destination);
    }, 4400);

    return () => {
      clearTimeout(flip);
      clearTimeout(fade);
      clearTimeout(go);
    };
  }, [stage, router]);

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

  // Takes over the whole screen: the thread and the composer are finished
  // with, and leaving them underneath invites a last-second edit that would
  // be lost on the redirect.
  if (stage === "finishing") {
    return (
      <FindingScreen
        eyebrow="// That's everything"
        title="Reading between your answers…"
        steps={[
          { label: `All ${answered} answers saved`, state: "done" },
          {
            label: wrapUpDone
              ? "Ready to find your overlap"
              : "Working out what matters to you",
            state: wrapUpDone ? "done" : "active",
          },
        ]}
        footnote="One quick step to save these to you."
        leaving={leaving}
      />
    );
  }

  return (
    <div className="flex screen-h flex-col overflow-hidden bg-canvas">
      <Header current={Math.min(answered + 1, total)} total={total} />

      <div
        ref={scrollerRef}
        // Stickiness is decided from USER gestures only. Reading it from
        // onScroll fed our own smooth-scroll back in: mid-flight the gap is
        // still large, which switched stickiness off and left every reply
        // parked half off-screen.
        onWheel={(e) => {
          const el = e.currentTarget;
          stickRef.current =
            el.scrollHeight - el.scrollTop - el.clientHeight < 120;
        }}
        onTouchMove={(e) => {
          const el = e.currentTarget;
          stickRef.current =
            el.scrollHeight - el.scrollTop - el.clientHeight < 120;
        }}
        className="scroll-contain min-h-0 flex-1 overflow-y-auto px-5 py-4"
      >
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

        <div className="h-2" />
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
        <VennMark size={36} inset />
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
