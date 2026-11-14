import { BgBlobs } from "@/components/BgBlobs";
import { ButtonLink } from "@/components/Button";
import { requireStage } from "@/server/auth";

/**
 * /chats — thread list. PLACEHOLDER.
 *
 * A thread only exists once an interest has been sent and accepted, and that
 * flow is phase 6. So this screen is empty by construction right now rather
 * than by accident, and says so instead of showing a spinner over nothing.
 *
 * It exists because the TabBar links here: a nav item that 404s is worse than
 * one that explains itself. `getThreads()` in server/chats is already written
 * against the real RPC and is what this screen will render.
 */
export const instant = false;

export default async function ChatsPage() {
  await requireStage("app");

  return (
    <div className="relative min-h-full">
      <BgBlobs />

      <div className="relative z-10 flex min-h-full flex-col items-center justify-center gap-3 bg-paper px-8 py-12 text-center">
        <p className="font-mono text-[11px] tracking-[0.12em] text-indigo uppercase">
          {"// Chats"}
        </p>
        <h1 className="font-display text-[26px] leading-[1.15] font-bold tracking-[-0.03em] text-ink">
          No conversations yet
        </h1>
        <p className="text-[15px] leading-relaxed text-slate">
          Once you send an interest and it&apos;s accepted, the chat opens
          here.
        </p>
        <ButtonLink href="/matches" variant="ghost" className="mt-3">
          See your matches
        </ButtonLink>
      </div>
    </div>
  );
}
