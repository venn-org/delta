"use client";

import { useState } from "react";
import { Avatar } from "@/components/Avatar";
import { BottomSheet } from "@/components/BottomSheet";
import { Button } from "@/components/Button";
import { ChatBubble } from "@/components/ChatBubble";
import { ChatComposer } from "@/components/ChatComposer";
import { ListRow } from "@/components/ListRow";
import { MatchCard } from "@/components/MatchCard";
import { MatchPill } from "@/components/MatchPill";
import { ProgressBar } from "@/components/ProgressBar";
import { QuickReplyChips } from "@/components/QuickReplyChips";
import { ScaleSlider } from "@/components/ScaleSlider";
import { Tag } from "@/components/Tag";
import { TypingIndicator } from "@/components/TypingIndicator";
import type { MatchListItem } from "@/lib/types";

const CLEAN_LABELS = ["Messy", "Chill", "Fine", "Pretty tidy", "Spotless"];

const unlocked: MatchListItem = {
  candidateId: "11111111-1111-1111-1111-111111111111",
  rank: 1,
  score: 94,
  isLocked: false,
  areaName: "Powai",
  displayName: "Ananya",
  age: 24,
  occupation: "UX designer, Swiggy",
  avatarUrl: null,
  reasons: [
    { key: "sleep", label: "Both night owls" },
    { key: "budget", label: "Same budget" },
  ],
  frictions: [{ key: "guests", label: "Hosts on weekends" }],
  isVerified: true,
};

// Exactly what the server sends for rank > 2 without an entitlement:
// no name, no age, no occupation, no photo, one reason tag.
const locked: MatchListItem = {
  candidateId: "22222222-2222-2222-2222-222222222222",
  rank: 3,
  score: 89,
  isLocked: true,
  areaName: "Andheri W",
  displayName: null,
  age: null,
  occupation: null,
  avatarUrl: null,
  reasons: [{ key: "cooking", label: "Both cook daily" }],
  frictions: [],
  isVerified: false,
};

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-mono text-[11px] tracking-[0.12em] text-slate uppercase">
        {title}
      </h2>
      {children}
    </section>
  );
}

export default function KitPage() {
  const [sleep, setSleep] = useState<string | null>("night_owl");
  const [clean, setClean] = useState(4);
  const [step, setStep] = useState(6);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sent, setSent] = useState<string[]>([]);

  return (
    <main className="mx-auto flex max-w-[390px] flex-col gap-8 bg-canvas px-5 py-10">
      <header>
        <h1 className="font-display text-[28px] font-bold tracking-[-0.03em]">
          venn
        </h1>
        <p className="font-mono text-[11px] tracking-[0.12em] text-indigo uppercase">
          {"// chat ui kit"}
</p>
      </header>

      <Section title="Buttons">
        <div className="flex flex-wrap gap-2.5">
          <Button>Start chatting</Button>
          <Button variant="ghost">Pass</Button>
          <Button variant="ink">Ink</Button>
        </div>
        <Button block disabled>
          Disabled
        </Button>
      </Section>

      <Section title="Tags & pill">
        <div className="flex flex-wrap items-center gap-2">
          <Tag kind="match">Both night owls</Tag>
          <Tag kind="friction">Hosts on weekends</Tag>
          <MatchPill score={94} />
        </div>
      </Section>

      <Section title="Avatars">
        <div className="flex items-center gap-3">
          <Avatar name="Ananya" size="sm" />
          <Avatar name="Kabir" size="md" />
          <Avatar name="Ishita" size="lg" />
          <Avatar name={null} size="lg" />
        </div>
      </Section>

      <Section title="Chat bubbles">
        <ChatBubble from="bot">
          Hey! I&apos;m Venn 👋 I&apos;ll ask about 10 quick things about how you
          live, then find people who live the same way.
        </ChatBubble>
        <ChatBubble from="user">Sounds good</ChatBubble>
        <TypingIndicator />
      </Section>

      <Section title="Quick-reply chips">
        <QuickReplyChips
          options={[
            { value: "night_owl", label: "Night owl" },
            { value: "early_bird", label: "Early bird" },
            { value: "depends", label: "Depends" },
          ]}
          selected={sleep}
          onSelect={setSleep}
        />
      </Section>

      <Section title="Slider & progress">
        <ScaleSlider
          label="Cleanliness"
          value={clean}
          onChange={setClean}
          endLabels={["Chill 😌", "Spotless ✨"]}
          valueLabel={CLEAN_LABELS[clean - 1]}
        />

        <ProgressBar current={step} total={10} />
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            className="min-h-11 flex-1 px-4 text-sm"
            onClick={() => setStep((s) => Math.max(1, s - 1))}
            disabled={step === 1}
          >
            Back
          </Button>
          <Button
            className="min-h-11 flex-1 px-4 text-sm"
            onClick={() => setStep((s) => Math.min(10, s + 1))}
            disabled={step === 10}
          >
            Next question
          </Button>
          <Button
            variant="ink"
            className="min-h-11 px-4 text-sm"
            onClick={() => setStep(1)}
          >
            Reset
          </Button>
        </div>
      </Section>

      <Section title="Match cards">
        <MatchCard match={unlocked} />
        <MatchCard match={locked} />
      </Section>

      <Section title="List rows">
        <ListRow
          leading={<Avatar name="Kabir" />}
          title="Kabir, 26"
          subtitle="Haha, cheese Maggi, no contest…"
          trailing={
            <span className="h-2 w-2 flex-none rounded-full bg-danger" />
          }
          onClick={() => {}}
        />
        <ListRow title="Report or block" destructive onClick={() => setSheetOpen(true)} />
      </Section>

      <Section title="Bottom sheet">
        <Button variant="ghost" onClick={() => setSheetOpen(true)}>
          Open sheet
        </Button>
        <BottomSheet
          open={sheetOpen}
          onClose={() => setSheetOpen(false)}
          title="What's going on with Kabir?"
        >
          <p className="mb-4 text-[14px] text-slate">
            He won&apos;t know you reported him. Our team reviews every report
            within 24 hours.
          </p>
          <Button block onClick={() => setSheetOpen(false)}>
            Report
          </Button>
        </BottomSheet>
      </Section>

      <Section title="Composer">
        {sent.length > 0 && (
          <div className="flex flex-col gap-2">
            {sent.map((m, i) => (
              <ChatBubble key={i} from="user">
                {m}
              </ChatBubble>
            ))}
          </div>
        )}
        <ChatComposer
          onSend={(body) => setSent((prev) => [...prev, body])}
          placeholder="Message"
        />
      </Section>
    </main>
  );
}
