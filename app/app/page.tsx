import { BgBlobs } from "@/components/BgBlobs";
import { ButtonLink } from "@/components/Button";

/** /app — Main.dc.html. Placeholder until phase 1 builds the real screen. */
export default function AppHome() {
  return (
    <div className="screen-min relative flex flex-col justify-between px-7 pt-16 pb-10">
      <BgBlobs />

      <div className="relative z-10">
        <div className="flex items-center gap-2">
          <span aria-hidden="true" className="relative h-7 w-11">
            <span className="absolute top-0 left-0 h-7 w-7 rounded-full bg-blue opacity-90" />
            <span className="absolute top-0 right-0 h-7 w-7 rounded-full bg-violet opacity-85" />
          </span>
          <span className="font-display text-[28px] font-bold tracking-[-0.03em]">
            venn
          </span>
        </div>

        <p className="mt-2 font-mono text-[11px] tracking-[0.12em] text-indigo uppercase">
          your flatmate matchmaker
        </p>

        <h1 className="mt-8 font-display text-[34px] leading-[1.15] font-bold tracking-[-0.03em] text-ink">
          Find a flatmate who lives like you.
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-slate">
          Ten quick questions about how you actually live. Then people who match
          — not a list of rooms.
        </p>
      </div>

      <div className="relative z-10 flex flex-col gap-3">
        <ButtonLink href="/app/chat" block>
          Start the chat
        </ButtonLink>
        <p className="text-center text-[13px] text-slate">
          Takes about two minutes. No sign-up yet.
        </p>
      </div>
    </div>
  );
}
