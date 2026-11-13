"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

const tabs = [
  { href: "/app/chats", label: "Chats", icon: ChatsIcon },
  { href: "/app/matches", label: "Matched", icon: MatchedIcon },
  { href: "/app/profile", label: "Profile", icon: ProfileIcon },
] as const;

function ChatsIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 5h16v11H9l-5 4z" />
    </svg>
  );
}

function MatchedIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 20V10M12 20V4M19 20v-7" />
    </svg>
  );
}

function ProfileIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c1-5 15-5 16 0" />
    </svg>
  );
}

/**
 * Bottom navigation. Shown on matches, chats and profile only — never during
 * onboarding, finding or checkout.
 *
 * `pb-safe` keeps it clear of the iOS home indicator; without
 * viewport-fit=cover in app/layout.tsx that inset resolves to 0 and the bar
 * sits under the gesture area.
 */
export function TabBar({ unreadChats = false }: { unreadChats?: boolean }) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Main"
      className="pb-safe sticky bottom-0 z-40 flex border-t border-mist bg-paper px-3 pt-1.5 pb-[18px]"
    >
      {tabs.map(({ href, label, icon: Icon }) => {
        const active = pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex min-h-[52px] flex-1 flex-col items-center justify-center gap-[3px] text-[11.5px] no-underline",
              active ? "font-bold text-blue" : "font-medium text-slate",
            )}
          >
            <span className="relative flex">
              <Icon />
              {label === "Chats" && unreadChats && (
                <span
                  aria-label="Unread messages"
                  role="status"
                  className="absolute -top-0.5 -right-1.5 h-2 w-2 rounded-full bg-danger"
                />
              )}
            </span>
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
