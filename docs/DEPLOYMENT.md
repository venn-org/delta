# Deploying

Target: **Vercel**, Mumbai region (`bom1`, set in `vercel.json` — the database
is the chatty dependency, so functions belong next to it).

Database: the hosted Supabase project **`delta-prod`**, ref
`evpnmmkligiqrlmcyxdn`. All migrations are applied and the schema diff is
clean.

---

## 1. Environment variables

Set these in Vercel → Project → Settings → Environment Variables. Values come
from Supabase → Project Settings → API.

| Variable | Scope | Value |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | all | `https://evpnmmkligiqrlmcyxdn.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | all | the hosted anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | production, preview | the hosted service-role key |
| `NEXT_PUBLIC_SITE_URL` | production | `https://app.vennflat.site` |
| `CRON_SECRET` | production | a long random string you generate |

**`ENABLE_DEV_LOGIN` must not exist in any Vercel environment.** It unlocks a
URL that signs anybody in as a real user without a password.

`SUPABASE_AUTH_EXTERNAL_GOOGLE_*` are **not** app variables. The local
Supabase stack reads them from `.env.local`; the hosted project takes the same
pair from its own dashboard. Do not add them to Vercel.

### The thing to decide before the first deploy

A Vercel build is a production build, so **`/dev/login` 404s on every
deployment**, preview included. That is correct and intended — but it means
the only way into the deployed app is a real sign-in, and right now that is
email codes capped at **2 per hour** on Supabase's shared SMTP.

Three ways out, in the order I'd pick them:

1. **Custom SMTP** (Resend, a verified domain). Lifts the cap, fixes
   deliverability, and is needed for launch regardless. An hour of work.
2. **Google OAuth.** No email at all. Needs a Google Cloud client; see §3.
3. Loosening the `/dev/login` gate. **Don't.** It puts a full authentication
   bypass on a public host.

## 2. Supabase auth settings

Supabase → Authentication → URL Configuration:

- **Site URL:** `https://app.vennflat.site`
- **Redirect allow-list:**
  - `https://app.vennflat.site/auth/callback`
  - `http://localhost:3000/auth/callback`
  - `http://127.0.0.1:3000/auth/callback`

Preview deployments get a new hostname per commit, so they cannot complete an
OAuth round trip unless you add a **stable branch alias** (Vercel gives
`<project>-git-<branch>.vercel.app`) and allow-list its `/auth/callback`.

## 3. Google OAuth

The authorised redirect URI is **Supabase's** endpoint, not this app's:

```
https://evpnmmkligiqrlmcyxdn.supabase.co/auth/v1/callback
```

For the local stack add `http://127.0.0.1:54421/auth/v1/callback` as well.

1. Google Cloud Console → APIs & Services → Credentials → Create OAuth client
   ID → **Web application**.
2. Add both redirect URIs above.
3. Paste the client ID and secret into Supabase → Authentication → Providers →
   Google, and enable it.
4. Locally: put the same pair in `.env.local` as
   `SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID` / `_SECRET`, then
   `npx supabase stop && npx supabase start` — the stack only reads them at
   startup.

## 4. Database changes

Migrations are **never** applied by a Vercel build. They go from a developer
machine or CI:

```bash
npx supabase db reset                      # prove it replays from empty
npx supabase test db                       # RLS suite must pass
npx supabase db push --remote --dry-run    # read the list
npx supabase db push --remote
npx supabase db diff --remote --schema public   # expect "No schema changes found"
```

Three CLI details that cost time if you forget them:

- `db push` **defaults to the local stack**. `--remote` is required for
  `delta-prod`. The CLI prints its target on every command; read that line.
- The look-only subcommand is `db query`, and `--read-only` on a hosted
  project refuses anything but `SELECT` / `WITH` / `VALUES` / `TABLE` /
  `SHOW` / `EXPLAIN`. That is a feature.
- **Never run `supabase config push`.** The local `config.toml` has
  `site_url = "http://127.0.0.1:3000"` and `skip_nonce_check = true`. Pushing
  it would point production auth at localhost and weaken OAuth.

`supabase/seed.sql` does not run on push. Reference data (areas, adjacency,
the eleven questions) lives in migration `…011`, so it ships with the schema.

## 5. CI

`.github/workflows/ci.yml`, on every pull request and every push to `main`,
runs one job: **web** — typecheck, lint, build. The build gets placeholder env
values of the right shape; no route connects to Supabase during a build.

**The database checks are not in CI.** They run on your machine:

```bash
npm run db:reset && npm run db:test
```

Do that before pushing anything under `supabase/`. The job was removed after
the mail container failed to bind port 54424 on a GitHub runner — the schema
replay itself worked, and the suite does not need mail, so restoring it is
one flag (`supabase start -x mailpit`).

Worth restoring before launch, because this is the security gap in the
pipeline: RLS is the entire authorization boundary (§3.2), and with no
database job, nothing automated checks that one user cannot read another's
rows. A green CI means the app compiles. It says nothing about whether it
leaks.

## 6. Still missing before this is a real launch

- **No error reporting.** Sentry or equivalent. Right now a 500 in production
  is visible only in Vercel's runtime logs.
- **No match worker.** `compute_matches_for` runs inline when someone finishes
  onboarding, so their own list is correct — but nothing drains `match_jobs`,
  so *existing* users' lists go stale when a new person joins. Phase 3.
- **Age and occupation are never collected.** Onboarding asks eleven
  questions and none of them is "how old are you", so match cards and the
  profile screen both render thin.
- `/unlock`, `/chats` and `/matches/[id]` are placeholders.
- Advisors report 47 warnings on `delta-prod` (0 errors): mostly
  `auth.uid()` unwrapped in RLS policies, which is a per-row re-evaluation
  cost, plus `anon` holding EXECUTE on RPCs that only make sense signed in.
