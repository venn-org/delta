import { Suspense } from "react";
import { TabBar } from "@/components/TabBar";
import { hasUnreadChats } from "@/server/chats";

/**
 * The shell for the three tabbed screens: /matches, /chats and /profile.
 *
 * A second route group inside (app), so it still adds no path segment. It
 * exists because the TabBar must appear on exactly these three screens and
 * nowhere else — not during onboarding, finding or checkout (docs/HANDOFF.md).
 * Putting it in the (app) layout would have shown it on all of them; repeating
 * it in each page would let the three drift apart.
 *
 * The column owns the scroll, not the document: inside the desktop
 * PhoneFrame the window does not scroll at all, so a screen that relies on
 * document scrolling simply overflows the bezel. `screen-h` resolves to the
 * viewport on a phone and to the frame's inner height above 861px.
 */
export default function TabsLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="screen-h flex flex-col">
      <div className="scroll-contain min-h-0 flex-1 overflow-y-auto">
        {children}
      </div>

      {/*
        The badge is a session read, so it cannot be prerendered into the
        static shell. Suspended on its own the bar still renders instantly,
        just without the dot for a moment, rather than blocking the screen.
      */}
      <Suspense fallback={<TabBar />}>
        <UnreadTabBar />
      </Suspense>
    </div>
  );
}

async function UnreadTabBar() {
  return <TabBar unreadChats={await hasUnreadChats()} />;
}
