import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,

  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),

  // --- Service-role containment (docs/ARCHITECTURE.md §3.2) ----------------
  // The admin client bypasses RLS. Route and page code must not reach for it;
  // use lib/supabase/server.ts, which runs as the signed-in user.
  {
    files: ["app/**/*.{ts,tsx}", "components/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["**/supabase/admin", "@/lib/supabase/admin"],
              message:
                "The service-role client bypasses RLS. Use @/lib/supabase/server instead. If this really is a webhook, cron job, session claim or moderation action, put the logic in server/<domain>/ and call it from there.",
            },
          ],
        },
      ],
    },
  },

  // The four legitimate callers. Webhooks and cron have no user session, so
  // they are allowed to construct the admin client directly.
  {
    files: ["app/api/webhooks/**/*.ts", "app/api/cron/**/*.ts"],
    rules: {
      "no-restricted-imports": "off",
    },
  },
]);

export default eslintConfig;
