import "server-only";
import { createClient } from "@/lib/supabase/server";

/**
 * What the profile screen shows the user about themselves.
 *
 * Only their OWN row, so there is no redaction to do here — the free-tier
 * rules in `get_match_list` are about looking at other people. RLS still
 * scopes every read below to auth.uid(), so this cannot be pointed at
 * somebody else even by mistake.
 *
 * Nothing from `private_contacts` is read. Phone and email never leave the
 * server (docs/ARCHITECTURE.md §4.1), and the screen has no use for them.
 */

export interface ProfileSummary {
  name: string;
  age: number | null;
  /** "SDE intern, TCS" — occupation and employer joined, either may be absent. */
  work: string | null;
  /** Their own neighbourhood, from profiles.home_area_id. */
  homeArea: string | null;
  isVerified: boolean;
  role: "seeker" | "haver" | null;
  /** Area names from the `locality` answer, in the order they picked them. */
  lookingIn: string[];
  /** Pre-formatted, e.g. "₹18–22k". Null when they never answered. */
  budget: string | null;
}

/** 18000 -> "18k", 7500 -> "7.5k". Rent is read in thousands here. */
function thousands(rupees: number): string {
  const k = rupees / 1000;
  return `${Number.isInteger(k) ? k : k.toFixed(1)}k`;
}

function formatBudget(value: unknown): string | null {
  if (!value || typeof value !== "object") return null;
  const { min, max } = value as Record<string, unknown>;
  if (typeof min !== "number" || typeof max !== "number") return null;
  // An en dash, and the ₹ only once: "₹18–22k", not "₹18k–₹22k".
  if (min === max) return `₹${thousands(min)}`;
  return `₹${thousands(min).replace(/k$/, "")}–${thousands(max)}`;
}

function slugsFrom(value: unknown): string[] {
  if (!value || typeof value !== "object") return [];
  const { areas } = value as Record<string, unknown>;
  if (!Array.isArray(areas)) return [];
  return areas.filter((slug): slug is string => typeof slug === "string");
}

export async function getProfileSummary(): Promise<ProfileSummary | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: profile }, { data: answers }] = await Promise.all([
    supabase
      .from("profiles")
      .select("display_name, age, occupation, employer, role, is_verified, areas(name)")
      .eq("id", user.id)
      .single(),
    supabase
      .from("answers")
      .select("question_key, value")
      .eq("user_id", user.id)
      .in("question_key", ["locality", "budget"]),
  ]);

  if (!profile) return null;

  const byKey = new Map((answers ?? []).map((row) => [row.question_key, row.value]));

  // Slugs come back in pick order; `areas` does not preserve that, so the
  // names are re-sorted to match rather than left in whatever order the
  // database felt like returning.
  const slugs = slugsFrom(byKey.get("locality"));
  let lookingIn: string[] = [];
  if (slugs.length > 0) {
    const { data: rows } = await supabase
      .from("areas")
      .select("slug, name")
      .in("slug", slugs);
    const names = new Map((rows ?? []).map((row) => [row.slug, row.name]));
    lookingIn = slugs.flatMap((slug) => {
      const name = names.get(slug);
      return name ? [name] : [];
    });
  }

  const work =
    [profile.occupation, profile.employer].filter(Boolean).join(", ") || null;

  return {
    name: profile.display_name?.trim() || "You",
    age: profile.age,
    work,
    homeArea: profile.areas?.name ?? null,
    isVerified: profile.is_verified,
    role: profile.role,
    lookingIn,
    budget: formatBudget(byKey.get("budget")),
  };
}
