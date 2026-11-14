"use client";

import { useEffect, useState } from "react";
import { BgBlobs } from "@/components/BgBlobs";

/**
 * Finding.dc.html — the "working on it" screen.
 *
 * Two uses, which is why the copy is props rather than baked in:
 *  - the beat between the last chat answer and /signin, so the chat does not
 *    snap straight to a form;
 *  - phase 3's real /finding, covering the inline compute_matches_for call.
 *
 * **Light, not dark.** The design file renders this on #14161B, but every
 * other screen in the app is on canvas, and dropping to full black for two
 * seconds mid-flow reads as a glitch rather than a transition. Same
 * composition and the same merging circles, on the app's own background.
 *
 * The circles drift together into a venn overlap on a 3.6s loop, blended so
 * the overlap darkens the way it would on paper. The global
 * prefers-reduced-motion switch in globals.css stops them, leaving the
 * composition static and still legible.
 */

export interface FindingStep {
  label: string;
  /** Done shows a green tick; active shows the spinner glyph. */
  state: "done" | "active";
}

export function FindingScreen({
  eyebrow,
  title,
  steps = [],
  footnote,
  leaving = false,
}: {
  eyebrow: string;
  title: string;
  steps?: FindingStep[];
  footnote?: string;
  /** Fades the screen out before the caller navigates away. */
  leaving?: boolean;
}) {
  // Fades in on mount rather than appearing fully formed: arriving here
  // straight from the chat thread was the other half of what felt abrupt.
  // A state flip on the first commit, not a CSS animation — see the note on
  // the step rows for why `both`-filled animations misbehave here.
  const [entered, setEntered] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <div
      className={`screen-h relative flex flex-col items-center justify-center overflow-hidden bg-canvas px-8 text-center transition-opacity duration-500 ease-out ${
        leaving || !entered ? "opacity-0" : "opacity-100"
      }`}
    >
      <BgBlobs />

      <div className="relative z-10 flex flex-col items-center">
        <div
          aria-hidden="true"
          className="venn-merge relative h-[140px] w-[220px]"
        >
          {/*
            mix-blend-multiply, not screen: on a light background the overlap
            has to get darker to read as an overlap at all.
          */}
          <span className="venn-merge-left absolute top-0 left-[10px] h-[140px] w-[140px] rounded-full bg-blue opacity-80 mix-blend-multiply" />
          <span className="venn-merge-right absolute top-0 right-[10px] h-[140px] w-[140px] rounded-full bg-violet opacity-75 mix-blend-multiply" />
        </div>

        {/*
          One polite announcement for a screen reader. The circles are
          decorative and the steps are not a live region — otherwise this
          would chatter as each one lands.
        */}
        <p
          role="status"
          className="mt-10 font-mono text-[11px] tracking-[0.12em] text-indigo uppercase"
        >
          {eyebrow}
        </p>

        <h1 className="mt-3 font-display text-[32px] leading-[1.1] font-bold tracking-[-0.03em] text-ink">
          {title}
        </h1>

        {steps.length > 0 && (
          <div className="mt-7 flex flex-col gap-2.5 text-left text-[15px]">
            {steps.map((step) => (
              <div
                key={step.label}
                // Deliberately NOT .venn-rise. That utility is built for the
                // chat thread, which mounts once; here the list re-renders
                // when a step flips to done, and its `both` fill left the
                // rows pinned at the from-keyframe (opacity 0) instead of
                // animating. The circles carry the motion on this screen.
                className={`flex items-center gap-2.5 transition-colors duration-300 ${
                  step.state === "done" ? "text-ink" : "text-slate"
                }`}
              >
                {step.state === "done" ? <TickIcon /> : <SpinnerIcon />}
                {step.label}
              </div>
            ))}
          </div>
        )}

        {footnote && (
          <p className="mt-9 text-[13.5px] text-slate">{footnote}</p>
        )}
      </div>
    </div>
  );
}

function TickIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#15803D"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="shrink-0"
    >
      <path d="M5 12l5 5 9-10" />
    </svg>
  );
}

function SpinnerIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="shrink-0"
    >
      <path d="M20 12a8 8 0 11-3-6.3" />
      <path d="M20 4v5h-5" />
    </svg>
  );
}
