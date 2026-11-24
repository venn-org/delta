import "server-only";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

/**
 * The self-described fields a user can change about themselves.
 *
 * These are exactly the columns migration 0015 grants UPDATE on. Everything
 * else on `profiles` — is_verified, status, role, home_area_id — is derived or
 * set by the claim, and the database refuses a direct write to it.
 */
export interface EditableProfile {
  displayName: string;
  age: number | null;
  occupation: string | null;
  employer: string | null;
  idealSunday: string | null;
}

export async function getEditableProfile(): Promise<EditableProfile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("display_name, age, occupation, employer, ideal_sunday")
    .eq("id", user.id)
    .single();
  if (!data) return null;

  return {
    displayName: data.display_name,
    age: data.age,
    occupation: data.occupation,
    employer: data.employer,
    idealSunday: data.ideal_sunday,
  };
}

/** Blank optional fields are stored as NULL, not as empty strings. */
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Keep it under ${max} characters.`)
    .transform((s) => (s === "" ? null : s));

const profileSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(1, "Add the name people will see.")
    .max(40, "Keep it under 40 characters."),
  // Matches the column's check constraint (age between 18 and 99).
  age: z
    .string()
    .trim()
    .transform((s, ctx) => {
      if (s === "") return null;
      const n = Number(s);
      if (!Number.isInteger(n) || n < 18 || n > 99) {
        ctx.addIssue({ code: "custom", message: "Age has to be between 18 and 99." });
        return z.NEVER;
      }
      return n;
    }),
  occupation: optionalText(60),
  employer: optionalText(60),
  idealSunday: optionalText(200),
});

export type UpdateProfileResult =
  | { ok: true }
  | { ok: false; errors: Partial<Record<keyof EditableProfile, string>>; error?: string };

export async function updateProfile(input: {
  displayName: string;
  age: string;
  occupation: string;
  employer: string;
  idealSunday: string;
}): Promise<UpdateProfileResult> {
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) {
    const errors: Partial<Record<keyof EditableProfile, string>> = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0] as keyof EditableProfile;
      errors[field] ??= issue.message;
    }
    return { ok: false, errors };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, errors: {}, error: "Your session ended. Sign in again." };

  const v = parsed.data;
  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: v.displayName,
      age: v.age,
      occupation: v.occupation,
      employer: v.employer,
      ideal_sunday: v.idealSunday,
    })
    .eq("id", user.id);

  if (error) {
    console.error("updateProfile", { code: error.code, message: error.message });
    return { ok: false, errors: {}, error: "Couldn't save that. Try again." };
  }
  return { ok: true };
}
