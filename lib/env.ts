/**
 * The Supabase URL and anon key, checked once instead of asserted everywhere.
 *
 * WHY THIS FILE EXISTS. These were `process.env.X!` at each call site. The `!`
 * is a promise to TypeScript that nothing enforces, so a missing variable
 * became `undefined`, `@supabase/ssr` built a client around it quite happily,
 * and the first query came back
 *
 *     Error: Could not load questions: Invalid API key
 *
 * — a message that describes the key as wrong when it was never there, from a
 * stack frame three layers from the cause. One throw here, naming the variable,
 * is worth an hour of reading that.
 *
 * NEXT_PUBLIC_ variables are INLINED AT BUILD TIME, not read at runtime. Two
 * consequences worth knowing:
 *
 *   1. This check effectively runs during `next build`, so a deployment with
 *      missing variables fails the build instead of serving 500s.
 *   2. Setting them in the Vercel dashboard changes nothing until you
 *      REDEPLOY. There is no restart that picks them up.
 *
 * The references below must stay written out literally. `process.env[name]`
 * with a computed key is not inlined and would read as undefined in the
 * browser.
 */

function required(name: string, value: string | undefined): string {
  if (!value || value.trim() === "") {
    throw new Error(
      `${name} is not set. Copy .env.example to .env.local and fill it in, ` +
        `or add it in your host's environment settings. Note that ` +
        `NEXT_PUBLIC_ variables are baked in at build time, so a deployment ` +
        `needs a rebuild after you change them.`,
    );
  }
  return value;
}

export const SUPABASE_URL = required(
  "NEXT_PUBLIC_SUPABASE_URL",
  process.env.NEXT_PUBLIC_SUPABASE_URL,
);

export const SITE_URL = required(
  "NEXT_PUBLIC_SITE_URL",
  process.env.NEXT_PUBLIC_SITE_URL,
);

export const SUPABASE_ANON_KEY = required(
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

/**
 * Is the anon key actually an anon key, and is it this project's?
 *
 * WHY THIS EXISTS. A deployment once went out with the LOCAL stack's
 * service-role key in NEXT_PUBLIC_SUPABASE_ANON_KEY, against the hosted URL.
 * Supabase answered every request with
 *
 *     401 UNAUTHORIZED_INVALID_API_KEY
 *     "Double check your Supabase `anon` or `service_role` API key."
 *
 * which is accurate and tells you nothing about which of the two mistakes you
 * made. There were two:
 *
 *   1. WRONG PROJECT. The local stack signs its keys with a published demo
 *      secret and `iss: "supabase-demo"`. Those keys are in Supabase's own
 *      docs; they are worthless anywhere but localhost.
 *   2. WRONG ROLE — and this is the dangerous one. `service_role` BYPASSES
 *      RLS, and anything named NEXT_PUBLIC_ is inlined into the browser
 *      bundle. The local demo key made it harmless this time. The hosted one
 *      in the same slot would have published an RLS-bypassing credential to
 *      every visitor, which is the single worst configuration mistake
 *      available in a Supabase app.
 *
 * So: refuse to start. A build that fails is a bad afternoon; the check this
 * replaces is noticing in a log.
 *
 * The payload is read WITHOUT verifying the signature. That is fine — we are
 * not trusting the token, only reading what it claims about itself, to catch
 * a copy-paste. Supabase does the verifying.
 */
function assertAnonKey(url: string, key: string): void {
  const isLocal = /^https?:\/\/(127\.0\.0\.1|localhost|\[::1\])(:|\/|$)/.test(url);

  // Newer projects issue sb_publishable_… / sb_secret_… instead of JWTs. The
  // secret one is the service-role equivalent and must never be public.
  if (key.startsWith("sb_secret_")) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_ANON_KEY holds a SECRET key (sb_secret_…). That " +
        "key bypasses row-level security and NEXT_PUBLIC_ variables are " +
        "shipped to the browser. Use the publishable key here, and put the " +
        "secret one in SUPABASE_SERVICE_ROLE_KEY.",
    );
  }
  if (key.startsWith("sb_publishable_")) return;

  const parts = key.split(".");
  if (parts.length !== 3) return; // Unknown format; let Supabase judge it.

  let payload: { role?: string; iss?: string };
  try {
    const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    payload = JSON.parse(atob(b64 + "=".repeat((4 - (b64.length % 4)) % 4)));
  } catch {
    return; // Not decodable; not our business to fail on.
  }

  if (payload.role && payload.role !== "anon") {
    throw new Error(
      `NEXT_PUBLIC_SUPABASE_ANON_KEY is a "${payload.role}" key, not an anon ` +
        `key. service_role bypasses row-level security and NEXT_PUBLIC_ ` +
        `variables are shipped to the browser, so this must never be set to ` +
        `it. Copy the anon / public key from Supabase → Project Settings → ` +
        `API, and keep the service-role key in SUPABASE_SERVICE_ROLE_KEY.`,
    );
  }

  if (payload.iss === "supabase-demo" && !isLocal) {
    throw new Error(
      `NEXT_PUBLIC_SUPABASE_ANON_KEY is a LOCAL development key ` +
        `(iss: supabase-demo) but NEXT_PUBLIC_SUPABASE_URL points at ` +
        `${url}. The local stack's keys are published in Supabase's docs and ` +
        `do not authenticate against a hosted project. Copy the hosted ` +
        `project's anon key, then REDEPLOY — NEXT_PUBLIC_ values are baked ` +
        `in at build time.`,
    );
  }
}

assertAnonKey(SUPABASE_URL, SUPABASE_ANON_KEY);
