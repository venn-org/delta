# Venn — build handoff (mobile-first web app)

Build a **mobile-first web app** in **Next.js (App Router) + TypeScript + Tailwind**. The `.dc.html` files in this folder are the source of truth: match them pixel-for-pixel. Open them in a browser to view. Ignore the `<x-dc>`, `<helmet>` and `data-dc-script` wrapper tags; they come from the design tool. Copy the markup and inline styles inside them.

## Layout rule (most important)
- Design every app screen at **390px wide**.
- Up to 860px wide, the app fills the screen with no frame.
- Above 860px, wrap the app in `<PhoneFrame>`: a 390×844 dark bezel with 52px outer radius and 40px screen radius. The screen scrolls inside it, on a Canvas background with two blurred blue and violet circles and a left-side blurb. Reference: `Landing-responsive.dc.html`.
- The marketing site (`Website.dc.html`) is a normal responsive page with no frame. Every "Try now" button links to `/app`.

## Tokens (`tailwind.config` → `theme.extend`)
| Token | Value | Use |
|---|---|---|
| blue | `#335CFF` | primary, user bubble, active tab |
| violet | `#8A5BFF` | secondary |
| indigo | `#3A2FD6` | mono eyebrows |
| ink | `#14161B` | text, dark screens |
| slate | `#5A6072` | secondary text |
| mist | `#E6E8EE` | borders |
| canvas | `#F2F3F7` | app background |
| paper | `#FCFCFD` | headers, sheets |
| match | `#15803D` | "why you match" tags (bg `#EAF8EF`) |
| friction | `#9A4A00` | heads-up tags (bg `#FFF3E6`) |
| danger | `#E5304F` | destructive, unread dot |
| gradient | `linear-gradient(90deg,#335CFF,#8A5BFF)` | primary CTA, match % pill, progress fill only |

**Fonts** (`next/font/google`):
- Space Grotesk 600/700 for display, with letter-spacing -0.03em.
- Hanken Grotesk 400–700 for all UI text.
- Space Mono for uppercase labels at 11px with letter-spacing 0.12em.

**Radii:** pill 50px (buttons, chips, inputs) · 20px cards and bubbles (tail corner 6px) · 16px rows · 14px fields · 24px sheet tops.

**Spacing:** 20px screen gutter (28px in onboarding). Touch targets are at least 44px.

**Shadows:**
- cards: `0 2px 10px rgba(0,0,0,.06)`
- bubbles: `0 1px 3px rgba(0,0,0,.06)`

## Components (`/components`)
- `ChatBubble` (bot | user)
- `TypingIndicator`
- `QuickReplyChips`
- `ScaleSlider`
- `ProgressBar`
- `ChatComposer`
- `MatchCard` (+ `locked` variant)
- `MatchPill`
- `Tag` (match | friction)
- `Button` (gradient | ink | ghost)
- `Avatar`
- `TabBar` (Chats · Matched · Profile)
- `BottomSheet`
- `ListRow`
- `PhoneFrame`
- `BgBlobs`

## Routes → design file

> **Stale prefix.** This table predates the app-only restructure. The repo is
> `app.vennflat.site` and the marketing site lives in its own project, so the
> `/app` prefix below is gone everywhere: `/app/matches` is `/matches`, `/app`
> itself is `/`, and `/` here is the other project. The mapping of screen to
> design file is still correct. See
> `docs/superpowers/specs/2026-11-14-app-restructure-and-auth-design.md`.

| Route | File |
|---|---|
| `/` | Website.dc.html |
| `/app` | Main.dc.html (+ PhoneFrame per Landing-responsive) |
| `/app/chat` | Chat-role → Flat-details (if "have a flat") → Chat-mobile; Chat-resume when returning |
| `/app/signup`, `/app/verify-otp` | Signup, OTP (right after the last chat question) |
| `/app/finding` | Finding.dc.html (after OTP) |
| `/app/matches` | Results-locked (free) / Results-mobile (unlocked) / No-matches |
| `/app/matches/[id]` | Match-detail |
| `/app/unlock` → `/app/checkout` → success / failed | Paywall, Checkout, Unlocked, Payment-failed |
| `/app/chats`, `/app/chats/requests`, `/app/chats/[id]` | Chats-list, Requests, Match-chat |
| `/app/match/[id]` | Its-a-match (shown after a mutual yes) |
| `/app/notifications` | Notifications |
| `/app/profile`, `/app/profile/answers`, `/app/profile/verify` | Settings, Edit-answers, Verify |
| Report sheet | Report.dc.html (BottomSheet on profile/chat) |

The TabBar shows only on matches, chats and profile. It does not show during onboarding, finding or checkout.

## Motion
- **On mount:** bubbles and cards fade in and rise 8px over 0.5s with `cubic-bezier(.2,.8,.2,1)`, staggered 80ms apart.
- **Progress bar:** fills from left over 0.9s.
- **Continuous:** match pill brightness pulses every 3s. Background blobs drift 18px over 14–16s. The finding-screen circles merge.
- **Interaction:** buttons lift 1px on hover and scale to 0.98 on press. Cards lift 2px on hover.
- **Reduce motion:** respect `prefers-reduced-motion` and disable all of the above.
- Use Tailwind keyframes or Framer Motion.

## Business rules: build these server-side, not just in the UI
- **Free tier:** the API returns full data for the top 2 matches only. For locked matches, return only match %, one reason tag and the area. Never send names or photos to the client and blur them there.
- **Chat:** opens only after a mutual "say hi".
- **Privacy:** phone numbers are never exposed to other users.
- **Sign up:** comes right after the onboarding chat, before the finding screen, with phone OTP. Store answers against an anonymous session first, then attach them to the user after OTP.

## Placeholders to confirm
- ₹99 price
- payment gateway name and refund policy
- coverage areas
- verification methods
