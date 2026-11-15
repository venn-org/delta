# Development and deployment cycle

Three tiers, one rule each:

| Tier | Git branch | Vercel | Supabase project | You get |
|---|---|---|---|---|
| **Production** | `main` | Production | `delta-prod` | `app.vennflat.site` |
| **Staging** | `development` | Preview | `delta-staging` | a stable branch URL |
| **Feature** | anything else | Preview | `delta-staging` | a per-commit URL |

The rule that makes this safe: **only `main` ever touches the production
database.** Feature branches and staging share one throwaway database, so a
bad migration or a test account costs you nothing.

---

## Why your `development` branch is building

It is supposed to. Vercel deploys **every** branch by default, and that is
what you want for staging — the problem is not that it builds, it is that it
builds with no environment of its own, so it either fails or quietly talks to
production.

Fixed by the environment setup below. If you later want to stop some branches
deploying, that is `vercel.json`:

```json
{
  "git": {
    "deploymentEnabled": {
      "experiment/*": false
    }
  }
}
```

Branches you do not list default to `true`. Minimatch patterns work. Setting
`"deploymentEnabled": false` turns off automatic deploys entirely.

I have **not** added that, because previews on feature branches are the thing
that would have caught the wrong-Supabase-key mistake before it reached
production.

---

## One-time setup

### 1. The staging database

Make a second Supabase project, `delta-staging`, in the same region
(`ap-south-1`).

The Free plan allows **two active projects**, counted across every
organization you own or administer — not per organization. `delta-prod` is
one. Staging is your second and last free one.

Two alternatives, both rejected:

- **Supabase Branching** is the "proper" answer and is **not on the Free
  plan**. On Pro it bills per branch-hour (~$0.0134), so a staging branch left
  running is roughly $10/month on top of the $25 plan.
- **Sharing `delta-prod` between staging and production.** Free, and wrong:
  the first migration you test would run against real users' rows, and
  staging's seeded junk would appear in production match lists.

Then push the schema into it:

```bash
npx supabase db push --remote=<staging-ref>
```

Put that ref into the two `STAGING_REF_GOES_HERE` placeholders in
`package.json` and you can use the short scripts from then on.

**Free projects pause after a week of inactivity.** A staging project you
touch rarely will be asleep when you next need it; unpausing is one click in
the dashboard, but it will look like an outage for a minute.

### 2. Vercel environment variables

This is the part that matters, and it is simpler than it looks. Vercel has
three scopes, and **Preview covers every non-production branch** — so you set
staging's credentials once and every feature branch inherits them.

| Variable | Production | Preview |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | prod URL | **staging URL** |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | prod anon key | **staging anon key** |
| `SUPABASE_SERVICE_ROLE_KEY` | prod service-role | **staging service-role** |
| `NEXT_PUBLIC_SITE_URL` | `https://app.vennflat.site` | the staging alias |
| `CRON_SECRET` | one you generate | a different one |

No branch-specific variables needed. If you ever do want one branch to differ:

```bash
vercel env add NEXT_PUBLIC_SUPABASE_URL --environment preview --git-branch development
```

Only Preview variables can target a branch.

**Set Production Branch to `main`** in Settings → Git. If that is still
whatever branch you first pushed, everything below is wrong.

### 3. A stable URL for staging

Preview deployments get a new hostname per commit, which OAuth cannot be
allow-listed against. Vercel also gives each branch a stable alias —
`<project>-git-development-<scope>.vercel.app`. Add its `/auth/callback` to
Supabase → Authentication → URL Configuration on **both** projects.

### 4. Branch protection

GitHub → Settings → Branches, for `main` and `development`: require the
`Typecheck · lint · build` check to pass. That is what makes CI a gate rather
than a notification you scroll past.

---

## The cycle

```
feature/matches-polish ──PR──> development ──PR──> main
      (preview)                 (staging)         (production)
```

**Start work**

```bash
git switch development && git pull
git switch -c feature/whatever
npx supabase start          # Docker must be running
npm run dev
```

**Before you push**

```bash
npm run typecheck && npm run lint
npm run db:check            # only if you touched supabase/
```

`db:check` is `db reset` then `test db` — it replays every migration into an
empty database and runs the RLS suite. CI does not do this, so you are the
only thing standing between a broken migration and staging.

**Merge to `development`.** CI runs, staging redeploys. If you added a
migration, push it to staging **and verify**:

```bash
npm run db:push:staging
npm run db:diff:staging     # expect "No schema changes found"
```

**Merge to `main`.** Then the same against production:

```bash
npm run db:push:prod
npm run db:diff:prod
```

---

## Four rules worth memorising

**Schema goes first, code goes second.** Vercel deploys the moment you merge.
Code that reads a column before the migration adding it has run will 500 on
live traffic. So: push the migration, confirm the diff is clean, *then* merge
the code. Removing something is the mirror image — ship the code that stops
using it, then drop it in a later migration.

**`--remote` without a ref means "whatever I last linked to."** That is one
`supabase link` away from pushing a staging experiment into production. Always
name the project:

```bash
npx supabase db push --remote=<ref>     # explicit, boring, safe
```

The `db:push:*` scripts exist so you never type the bare form.

**`.env.local` points at the local stack. Always.** Not staging, not
production. Hosted credentials belong in Vercel, where they cannot be read by
anything running on your laptop and cannot be pasted into the wrong variable.

**Never run `supabase config push`.** The local `config.toml` carries
`site_url = "http://127.0.0.1:3000"` and `skip_nonce_check = true`. Pushing it
points a hosted project's auth at localhost.

---

## What is still manual

- **Migrations.** No pipeline applies them. Deliberate for now: a schema
  change against real data deserves a human watching, and `db push` is two
  words. Worth automating once staging has proven a few releases.
- **The RLS suite.** Out of CI after the mail container could not bind its
  port on a runner. `npm run db:check` locally covers it; see
  `docs/DEPLOYMENT.md`.
- **Rollback.** Vercel can instantly promote a previous deployment, so code
  rollback is a click. **Migrations have no down path** — the only recovery is
  a new migration that undoes the change. Write the forward fix, do not try to
  reverse one in place.
