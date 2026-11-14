# Venn — `app.vennflat.site`

Flatmate matching for Mumbai. Eleven questions in a chat, then a ranked list
of people whose habits actually fit yours.

This repo is the **app only**. The marketing site is a separate project.

- `docs/ARCHITECTURE.md` — how it works and why. Read this first.
- `docs/HANDOFF.md` — design tokens, components, screen-to-design mapping.
- `design_elements/*.dc.html` — the designs, source of truth for every screen.
- `AGENTS.md` — read before writing code. This is Next.js 16; it is not the
  Next.js you remember.

## Running it

You need Node 22+ and Docker (for the local Supabase stack).

```bash
npm ci
cp .env.example .env.local      # then fill it in
npx supabase start              # prints the URL and keys for .env.local
npm run dev
```

Then open <http://localhost:3000>.

There is no email or Google sign-in locally unless you configure it. Instead,
with `ENABLE_DEV_LOGIN=true` in `.env.local`:

| URL | What it does |
|---|---|
| `/dev/login` | Signs in as a dummy user with onboarding finished |
| `/dev/login?state=onboarding` | Signs in mid-onboarding |
| `/dev/login?out=1` | Signs out |

`/dev/login` is a complete authentication bypass. It 404s unless
`ENABLE_DEV_LOGIN=true` **and** the build is not a production build. Never set
it on a deployment.

## Scripts

| Command | |
|---|---|
| `npm run dev` | Dev server (Turbopack) |
| `npm run build` | Production build |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm run db:reset` | Replay every migration into an empty local database |
| `npm run db:test` | pgTAP suite — the RLS tests |

CI runs typecheck, lint and build on every pull request
(`.github/workflows/ci.yml`). It does **not** run the database checks — run
those yourself before pushing anything that touches `supabase/`:

```bash
npm run db:reset && npm run db:test
```

`db:reset` replays every migration into an empty database, which is the check
that catches a migration only working as a patch on your local state.
`db:test` is the RLS suite, and RLS is the authorization boundary — so a green
CI tells you the app compiles and nothing more.

## Routes

Parentheses in `app/` are route groups and add no path segment, so
`app/(app)/(tabs)/matches/page.tsx` serves at `/matches`.

| Path | |
|---|---|
| `/` | Entry router — resolves to onboarding, sign-in or the app |
| `/onboarding`, `/onboarding/chat` | The eleven questions |
| `/signin`, `/verify` | Email code |
| `/finding` | The pause while matches compute |
| `/matches`, `/matches/[id]` | The list, and one match |
| `/chats`, `/profile` | The other two tabs |
| `/unlock` | Paywall |
| `/kit` | Component gallery. 404s in a production build. |

## Deploying

See `docs/DEPLOYMENT.md`.

## Two rules that are not style preferences

**RLS is the authorization boundary.** Not `proxy.ts`, not the route guards.
Those are redirect conveniences. Every table has row-level security and the
pgTAP suite is what proves it.

**The service-role key bypasses RLS and is read in exactly one file**
(`lib/supabase/admin.ts`). ESLint blocks importing it from `app/**` and
`components/**`. If you need it, the logic belongs in `server/<domain>/`.
