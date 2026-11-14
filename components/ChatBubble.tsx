import { cn } from "@/lib/cn";
import { VennMark } from "./VennMark";
import type { ReactNode } from "react";

/** The Venn mark that sits beside every bot bubble. */
function BotAvatar() {
  return <VennMark size={28} inset />;
}

/**
 * Chat bubble, used by both the onboarding bot and real 1:1 match chat.
 *
 * Note the deliberate absence of `user-select: none` — message text must stay
 * selectable so people can copy an address or a phone number out of a thread.
 */
export function ChatBubble({
  from,
  children,
  showAvatar = true,
  className,
}: {
  from: "bot" | "user";
  children: ReactNode;
  /** Hide on consecutive bot bubbles so the mark is not repeated. */
  showAvatar?: boolean;
  className?: string;
}) {
  const isBot = from === "bot";

  return (
    <div
      className={cn(
        "venn-rise flex gap-2",
        isBot ? "items-end" : "justify-end",
        className,
      )}
    >
      {isBot && (showAvatar ? <BotAvatar /> : <span className="w-7 flex-none" />)}
      <div
        className={cn(
          "px-3.5 py-3 text-[15px] leading-[1.4]",
          isBot
            ? "bubble-tail-bot max-w-[280px] bg-white text-ink shadow-bubble"
            : "bubble-tail-user max-w-[260px] bg-blue text-white",
        )}
      >
        {children}
      </div>
    </div>
  );
}
