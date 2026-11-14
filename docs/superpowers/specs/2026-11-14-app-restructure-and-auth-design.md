# Design — app-only restructure and auth

Date: 2026-11-14 · Status: **Proposed, awaiting approval**
Companions: [HANDOFF.md](../../HANDOFF.md) (frontend contract), [ARCHITECTURE.md](../../ARCHITECTURE.md) (backend; §3.2, §4.3, §6.5, ADR-004 and ADR-008 are load-bearing here)

---

## 1. Intent and why

This repository is **only the app**. The marketing site is a separate project on
the apex domain (`www.vennflat.site`); this one is `app.vennflat.site`. The
route tree still carries an `/app` prefix from when both were going to live
together, so every path is doubled (`app.vennflat.site/app/chat`). The prefix
now means nothing and reads as a mistake.

At the same time, nothing signs anyone in. `/app/signup` renders the screen but
both buttons set a "not wired up yet" notice. `claim_onboarding_session()`
exists in the database and has no caller, so ten answered questions still
evaporate. That is phase 2 of the ARCHITECTURE build order, and everything
after it (finding, matches, paywall, chat) is blocked behind it.

Both changes touch the same files — every internal link, every redirect, the
signup screen itself — so they ship together as one pass.

**Why now.** Auth is the gate on phases 3–8. The restructure has to happen
before more routes are added, or every new screen is one more `/app/...` path
to rewrite later.

**Success looks like:** someone lands on `app.vennflat.site/onboarding` from the
marketing site, answers the questions anonymously, signs in with Google or an
email code, and their answers are attached to the new account. Returning to the
bare domain puts them where they belong without them choosing.

---

## 2. Goals

- G1. Drop the `/app` segment. Routes live at `/`, `/onboarding`, `/signin`, `/verify`.
- G2. `/` is a pure entry router with no content of its own.
- G3. Google OAuth and email OTP both sign a user in, end to end.
- G4. Answers survive sign-in via `claim_onboarding_session()`. A double submit is a no-op.
- G5. Session refresh works, so server reads never see a stale token.
- G6. Signed-in users reaching an onboarding route, and signed-out users reaching an app route, are redirected rather than shown a broken page.

## 3. Non-goals

- The marketing site, and the `www` → `app` redirect. Separate project; the
  user is handling it.
- `/finding`, `/matches` and everything downstream. Phase 3 onward. `/` will
  redirect a signed-in user to `/matches`; this slice leaves a placeholder there.
- Phone auth. Deferred by ADR-008.
- Password login, and magic links as clickable URLs. Code entry only.
- `/kit` (the component gallery). Left exactly where it is.

## 4. Anti-goals

Things that would make this a failure even if it technically worked:

- **A1. Auth decided in the proxy.** Authorization stays in RLS and server
  reads (§3.2, §6.5). The proxy refreshes the token and nothing else. The Next
  docs are explicit that proxy "should not be used as a full session management
  or authorization solution".
- **A2. Sign-in before the questions.** The funnel is anonymous-first: answer
  ten questions, then be asked for an identity. Making `/signin` the mandatory
  first step would strand the anonymous session and the claim RPC as dead code,
  and ADR-004 exists to prevent exactly that.
- **A3. A cold visitor dead-ends.** Someone who types the bare domain with no
  cookies at all reaches `/signin`, which must offer a way into `/onboarding`.
- **A4. A lost answer.** If the claim fails, the user must not land in the app
  with an empty profile and no way back to their answers.

## 5. Constraints

- **Next.js 16.4.6.** `middleware.ts` is **deprecated and renamed `proxy.ts`**
  (same functionality, same `config.matcher`, exported as `proxy` or as the
  default). The published `@supabase/ssr` recipe is still written as
  `middleware.ts` and must be ported, not copied.
- **`cacheComponents: true`.** A session read cannot be prerendered into the
  static shell, and reading `cookies()` outside a `<Suspense>` boundary is a
  build error. Existing routes set `export const instant = false` to block on
  the server instead; `export const dynamic` is rejected outright in this
  setup. New session-reading routes follow the same convention.
- **Supabase Auth**, three clients exactly as §3.2 defines them. The
  service-role key is read in one file only.
- `supabase/config.toml` currently has `site_url = "http://127.0.0.1:3000"`,
  `[auth.sms] enabled = false`, no Google provider block, and
  `[auth.rate_limit] email_sent = 2` per hour — the built-in limit that applies
  until custom SMTP is configured.
- `handle_new_user()` already creates the `profiles` and `private_contacts`
  rows on every `auth.users` insert, taking `display_name` from
  `raw_user_meta_data.full_name` or `.name` and falling back to `''`.

---

## 6. Approaches

Both of the first two reach the same end state. The question was whether to
separate the move from the wiring.

**A — two passes.** A pure restructure commit with no behaviour change, then
auth on clean paths. Reviewable: the move is mechanical and verifiable by
"nothing changed", and the auth diff afterwards is only auth.

**B — one pass (chosen).** Move and wire together. Fewer commits, and the
`/app/signup` screen is rewritten once instead of moved and then rewritten. The
cost is that while debugging, a stale `/app/...` redirect and a broken auth
callback present identically.

**C — auth first, restructure later.** Rejected. It writes new auth routes at
paths already known to be wrong, guaranteeing a second rewrite.

**Chosen: B**, at the user's direction. I had recommended A for the
reviewability. Mitigation for B's one real cost: the restructure is done as its
own step inside the pass, and the app is confirmed working at the new paths
*before* any auth code is written, so the two failure modes stay separable in
practice even though they land in one change.

---

## 7. The route tree

| Now | After | What it is |
|---|---|---|
| `/` | `/` | Entry router. No content. |
| `/app` | `/onboarding` | Intro: "Start the chat" (`Main.dc.html`) |
| `/app/chat` | `/onboarding/chat` | The question flow (`Chat-*.dc.html`) |
| `/app/signup` | `/signin` | Google + email, code requested (`Signup.dc.html`) |
| — | `/verify` | Code entry (`OTP.dc.html`) |
| — | `/auth/callback` | OAuth code exchange. Route handler, no UI. |
| `/app/matches` (referenced, absent) | `/matches` | Placeholder this slice |
| `/kit` | `/kit` | Unchanged |

`app/app/layout.tsx` wraps every app route in `<PhoneFrame>`. With the segment
gone that moves into the root layout, so the shell applies everywhere.

**Open call, mine:** the chat lives at `/onboarding/chat` rather than at
`/onboarding`, with `/onboarding` keeping the intro screen. The user named
`/onboarding` as the marketing destination, and the intro is what a new arrival
should see — the designs have a distinct `Main` screen before the chat, and
collapsing them would discard it. Marketing's link therefore needs no change in
meaning.

### 7.1 What `/` decides

In order:

1. **Supabase user present** → `/matches`.
2. **Onboarding cookie present with at least one answer** → `/onboarding/chat`
   (the `Chat-resume` screen).
3. **Onboarding cookie present, nothing answered** → `/onboarding`.
4. **Neither** → `/signin`.

Rule 4 is the user's decision and is the one worth stating plainly: a cold
visitor to the bare domain is treated as a returning user who lost their
session, not as a new one. New arrivals come from marketing straight to
`/onboarding` and never see `/signin` first. This is why **A3** matters —
`/signin` carries a visible link to `/onboarding` for anyone who guessed the
bare domain, and that link is a requirement of this design, not decoration.

### 7.2 Guards

Each route decides for itself, in its server component, against
`supabase.auth.getUser()`:

- `/signin`, `/verify`: signed in → `/matches`.
- `/onboarding`, `/onboarding/chat`: signed in → `/matches`. (Re-taking the
  chat as a signed-in user is `/profile/answers` in phase 7, a different
  screen.)
- `/matches` and later app routes: signed out → `/signin`.

Deliberately **not** in the proxy (**A1**).

---

## 8. Auth

### 8.1 `server/auth/`

A new domain module with a public interface only, per §3.1:

- `signInWithEmail(email, firstName)` — `signInWithOtp` with
  `shouldCreateUser: true` and `options.data.full_name = firstName`, so
  `handle_new_user()` has a name to write into `profiles.display_name`. Without
  it an email-OTP user gets `''`, which a Google user does not.
- `verifyEmailCode(email, code)` — `verifyOtp({ type: 'email' })`, then claim.
- `startGoogleOAuth()` — `signInWithOAuth` with `redirectTo` pointing at
  `/auth/callback`, PKCE.
- `claimAnswers(userId)` — reads the session id **from the cookie only**, calls
  the RPC, clears the cookie on success.
- `signOut()`.

### 8.2 The claim

One call to `claim_onboarding_session(session_id, user_id)` on first successful
sign-in, from both paths. The RPC is already idempotent: it accepts
`claimed_by is null or claimed_by = p_user_id`, upserts answers on conflict,
skips keys that are no longer live questions, and only moves `status` out of
`'onboarding'`.

Cookie handling: the session id comes from the httpOnly cookie, never from a
form field or a query parameter. `server/onboarding/session.ts` already enforces
this and is the only non-webhook caller of the admin client.

**If the claim raises `session_unclaimable`** (expired, or already claimed by
somebody else) the user is signed in but has no answers. Per **A4** they go to
`/onboarding` to answer again, not into an empty `/matches`. The error is
logged; it should be rare.

### 8.3 OAuth callback

`/auth/callback` is a route handler: `exchangeCodeForSession(code)`, then claim,
then redirect. On error, back to `/signin` with a readable message. It must not
be a page — the exchange writes cookies, which a server component cannot do.

### 8.4 Session refresh — `proxy.ts`

At the repo root, a sibling of `app/`. It refreshes the Supabase token by
creating a server client over the request/response cookie pair and calling
`getUser()`, then returns the response with any rotated cookies attached. No
redirects, no reads beyond that.

`matcher` excludes `_next/static`, `_next/image`, `favicon.ico` and image
extensions.

This is what the comment in `lib/supabase/server.ts` already assumes ("Called
from a Server Component, where cookies are read-only. Middleware refreshes the
session, so this is safe to swallow") — the comment needs its wording updated to
`proxy`, and the thing it describes needs to start existing.

### 8.5 Supabase configuration

In `supabase/config.toml`:

- `site_url` and `additional_redirect_urls` to cover `http://127.0.0.1:3000`
  (local), the Vercel preview domain, and `https://app.vennflat.site`.
- `[auth.external.google]` enabled, with `client_id` and `secret` via
  `env(...)` substitution. `skip_nonce_check = true` is required for *local*
  Google sign-in only.
- Email OTP: `[auth.email] enabled = true` is already set. The default
  `email_sent = 2` per hour is too low to test against, so custom SMTP (Resend,
  per §2 of ARCHITECTURE) raises it. Production needs it; local development
  uses Inbucket and does not.

**Secrets never enter the repo.** `.env.local` and the Vercel project hold them;
`config.toml` references them by name.

---

## 9. What's left to the builder

- Component structure within `/signin` and `/verify`. `SignupForm.tsx` exists
  and is close; it needs its submit handler wired and a resend-code affordance.
- The `/verify` screen's copy. `OTP.dc.html` is written for phone
  ("+91 98201 •••67") and needs the email variant ADR-008 calls for.
- Error copy, in the voice already used in `app/app/chat/actions.ts`
  ("That's a lot of restarts. Give it an hour and try again.").
- Whether `/matches` is a stub page or a redirect to a "coming soon" state.
- Test shape. There is pgTAP (`supabase/tests/rls_test.sql`) and no JS test
  runner. Adding one is in scope only if the builder judges it cheap; the claim
  idempotency case is the one worth covering and is testable in pgTAP today.
