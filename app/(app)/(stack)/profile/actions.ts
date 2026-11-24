"use server";

import { revalidatePath } from "next/cache";
import {
  saveMyAnswer,
  updateProfile,
  type SaveAnswerResult,
  type UpdateProfileResult,
} from "@/server/profile";

/**
 * Profile edits. Both inputs come from the client and are validated in the
 * profile domain; the database then re-checks who is writing (RLS, the column
 * grant from migration 0015, and save_answer's own auth.uid()).
 */

export async function updateProfileAction(input: {
  displayName: string;
  age: string;
  occupation: string;
  employer: string;
  idealSunday: string;
}): Promise<UpdateProfileResult> {
  const result = await updateProfile(input);
  if (result.ok) revalidatePath("/profile");
  return result;
}

export async function saveAnswerAction(
  key: string,
  raw: unknown,
): Promise<SaveAnswerResult> {
  const result = await saveMyAnswer(key, raw);
  if (result.ok) {
    revalidatePath("/profile");
    revalidatePath("/matches");
  }
  return result;
}
