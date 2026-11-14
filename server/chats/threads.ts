import "server-only";
import { createClient } from "@/lib/supabase/server";

/**
 * Chat threads for the Chats tab.
 *
 * `get_chat_threads` already computes each thread's unread count in one query
 * against `match_reads`, so the tab badge does not need a second round trip
 * (docs/ARCHITECTURE.md §6.1).
 */

export interface ChatThread {
  matchId: string;
  otherId: string;
  otherName: string;
  lastBody: string | null;
  lastAt: string | null;
  unreadCount: number;
}

export async function getThreads(): Promise<ChatThread[]> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("get_chat_threads");
  if (error) throw new Error(`get_chat_threads: ${error.message}`);

  return (data ?? []).map((row) => ({
    matchId: row.match_id,
    otherId: row.other_id,
    otherName: row.other_name,
    lastBody: row.last_body,
    lastAt: row.last_at,
    unreadCount: row.unread_count,
  }));
}

/**
 * Whether any thread has something unread — the only thing the tab badge
 * needs. It is a boolean rather than a number on purpose: the badge is a dot,
 * and a count nobody renders is a count that can be wrong unnoticed.
 */
export async function hasUnreadChats(): Promise<boolean> {
  try {
    const threads = await getThreads();
    return threads.some((thread) => thread.unreadCount > 0);
  } catch {
    // A failed badge must not take the whole tab bar down with it.
    return false;
  }
}
