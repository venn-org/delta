"use server";

import { sayHi, type SayHiResult } from "@/server/matches";

/**
 * "Say hi" from the detail screen. The id comes from the client and is not
 * trusted: `send_interest` re-checks visibility, entitlement and the rate
 * limit for whoever is signed in.
 */
export async function sayHiAction(candidateId: string): Promise<SayHiResult> {
  return sayHi(candidateId);
}
