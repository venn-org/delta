import "server-only";
import { cookies, headers } from "next/headers";
import { connection } from "next/server";
import { createHash, randomUUID } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import type { AnswerValue } from "@/lib/answers";
import type { FlatDraft } from "@/lib/flat";

export const SESSION_COOKIE = "venn_onboarding";
const MAX_AGE_SECONDS = 7 * 24 * 60 * 60;

export interface OnboardingSession {
  id: string;
  answers: Record<string, AnswerValue>;
  role: "seeker" | "haver" | null;
  flatDraft: FlatDraft | null;
  step: number;
  claimedBy: string | null;
  createdAt: string;
}

/**
 * Onboarding sessions belong to an anonymous browser identified by an
 * httpOnly cookie, which the database cannot verify — so `onboarding_sessions`
 * has RLS enabled and NO policies, and every access here goes through the
 * service role (§6.5).
 *
 * This module is the only legitimate non-webhook caller of the admin client,
 * and it never trusts a session id from anywhere but the cookie.
 */

async function hashedIp(): Promise<string | null> {
  const h = await headers();
  const raw =
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip");
  if (!raw) return null;
  // Hashed, never stored raw: it is only ever compared, for throttling.
  return createHash("sha256").update(raw).digest("hex").slice(0, 32);
}

function rowToSession(row: {
  id: string;
  answers: unknown;
  role: "seeker" | "haver" | null;
  flat_draft: unknown;
  step: number;
  claimed_by: string | null;
  created_at: string;
}): OnboardingSession {
  return {
    id: row.id,
    answers: (row.answers as Record<string, AnswerValue>) ?? {},
    role: row.role,
    flatDraft: (row.flat_draft as FlatDraft | null) ?? null,
    step: row.step,
    claimedBy: row.claimed_by,
    createdAt: row.created_at,
  };
}

/** Reads the current session, or null. Safe to call from a Server Component. */
export async function getSession(): Promise<OnboardingSession | null> {
  // The expiry comparison below uses new Date(), which Cache Components
  // treats as an unstable value during prerender. This marks the read as
  // request-time so prerendering stops here instead of failing.
  await connection();

  const jar = await cookies();
  const id = jar.get(SESSION_COOKIE)?.value;
  if (!id) return null;

  const admin = createAdminClient();
  const { data } = await admin
    .from("onboarding_sessions")
    .select("id, answers, role, flat_draft, step, claimed_by, created_at")
    .eq("id", id)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  return data ? rowToSession(data) : null;
}

/**
 * Reads the session, creating one if needed.
 *
 * Writes a cookie, so it may ONLY be called from a Server Action or Route
 * Handler — a Server Component render cannot set cookies.
 */
export async function ensureSession(): Promise<OnboardingSession> {
  const existing = await getSession();
  if (existing) return existing;

  const admin = createAdminClient();
  const ipHash = await hashedIp();

  if (ipHash) {
    const { data: allowed } = await admin.rpc("consume_rate_limit", {
      p_bucket: `onboarding:${ipHash}`,
      p_limit: 10,
      p_window: "01:00:00",
    });
    if (allowed === false) {
      throw new Error("rate_limited");
    }
  }

  const h = await headers();
  const { data, error } = await admin
    .from("onboarding_sessions")
    .insert({
      id: randomUUID(),
      user_agent: h.get("user-agent")?.slice(0, 500) ?? null,
      ip_hash: ipHash,
    })
    .select("id, answers, role, flat_draft, step, claimed_by, created_at")
    .single();

  if (error || !data) {
    throw new Error(`Could not start the chat: ${error?.message ?? "unknown"}`);
  }

  const jar = await cookies();
  jar.set(SESSION_COOKIE, data.id, {
    httpOnly: true, // unreachable from JS, unlike localStorage
    sameSite: "lax", // survives the OAuth redirect back from Google
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });

  return rowToSession(data);
}

/** Patches one answer into the session. */
export async function saveAnswer(
  sessionId: string,
  questionKey: string,
  value: AnswerValue,
  step: number,
): Promise<void> {
  const admin = createAdminClient();

  // Read-modify-write on a jsonb column. Safe here because a single browser
  // drives one session and answers arrive one at a time.
  const { data: current } = await admin
    .from("onboarding_sessions")
    .select("answers")
    .eq("id", sessionId)
    .single();

  const answers = {
    ...((current?.answers as Record<string, AnswerValue>) ?? {}),
    [questionKey]: value,
  };

  const { error } = await admin
    .from("onboarding_sessions")
    .update({ answers, step })
    .eq("id", sessionId)
    .is("claimed_by", null);

  if (error) throw new Error(`Could not save that answer: ${error.message}`);
}

export async function setRole(
  sessionId: string,
  role: "seeker" | "haver",
): Promise<void> {
  const admin = createAdminClient();
  await admin
    .from("onboarding_sessions")
    .update({ role })
    .eq("id", sessionId)
    .is("claimed_by", null);
}

export async function setFlatDraft(
  sessionId: string,
  draft: FlatDraft,
): Promise<void> {
  const admin = createAdminClient();
  await admin
    .from("onboarding_sessions")
    .update({ flat_draft: draft as never })
    .eq("id", sessionId)
    .is("claimed_by", null);
}

/** "Start over" — drops the cookie so the next answer begins a fresh session. */
export async function clearSession(): Promise<void> {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}
