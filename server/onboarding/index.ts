import "server-only";

/**
 * The onboarding domain's public interface (§3.1).
 *
 * Other domain modules import from here and never from a file inside this
 * folder. That rule is what keeps `server/auth/` from reaching past this
 * boundary to the admin client, and what would make extracting this domain a
 * mechanical job rather than a rewrite.
 */

export { claimSession } from "./claim";
export type { ClaimOutcome } from "./claim";

export {
  SESSION_COOKIE,
  clearSession,
  ensureSession,
  getSession,
  saveAnswer,
  setFlatDraft,
  setRole,
} from "./session";
export type { OnboardingSession } from "./session";

export { loadQuestions, questionsForRole } from "./questions";
