# SRM Industry Mentor Portal

A LinkedIn-style portal for SRM students and faculty to reach out to industry
mentors, sponsors, chief guests, and hackathon judges directly — instead of
routing every ask through whichever professor happens to have the contact.

- **Students & faculty** post past events (who came, what they got) and open
  requirements ("wanted: sponsor for X domain, offering ₹Y").
- **Industry contacts** are entered manually (they don't use the app) with
  their domains, minimum cost, and event history.
- Posting is gated to faculty and student club members a faculty member has
  explicitly authorized — everyone else can browse.

Stack: Next.js (App Router, TypeScript), Tailwind CSS v4, Supabase
(Postgres + Auth + Row Level Security). No separate backend.

## Setup

1. **Supabase project** — use the one you've already created. Grab the
   Project URL and anon key from Project Settings → API.

2. **Environment variables** — copy the example and fill in your values:

   ```bash
   cp .env.local.example .env.local
   ```

3. **Database schema** — open the Supabase SQL editor and run
   [`supabase/schema.sql`](./supabase/schema.sql). It creates every table,
   the sign-up trigger, and all Row Level Security policies in one go.

4. **Auth settings** — in Supabase Auth settings, enable the Email provider
   with "Confirm email" / magic-link OTP (this app uses passwordless
   sign-in). Add `http://localhost:3000/auth/callback` (and your deployed
   URL's equivalent) to the allowed Redirect URLs.

5. **Run it**:

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000). Sign-up is
   restricted to `@srmist.edu.in` addresses — this is enforced at the
   database level (`handle_new_user()` in the schema), not just in the UI.

## How the pieces map to the schema

| Feature | Table |
|---|---|
| Student/faculty profile | `profiles` |
| Past events (the "who's already been" feed) | `past_events` |
| Current requirements (the "wanted" posts) | `requirements` |
| Industry contact directory | `industry_profiles` |
| Events an industry contact has attended | `industry_past_events` |
| An industry contact's own ask, logged by a student/faculty | `industry_requests` |
| Faculty granting a student club-posting rights | `profiles.is_club_authorized` (toggled from `/admin`) |

## Notes / deliberate simplifications

- **Auth is magic-link only** — no passwords to manage or reset. A student's
  role (student/faculty) is set at first sign-in via metadata and can only be
  changed afterwards by an existing faculty account (enforced by a DB
  trigger, not just the UI).
- **SRM staff-finder auto-fetch is not implemented.** The staff-finder site
  blocks automated requests, and scraping personal staff data automatically
  raises its own concerns — the "Experience" field on `/profile/edit` is a
  manual paste-in for now. If SRM later exposes an API or a scrape is
  explicitly authorized, that's a self-contained addition to
  `profiles.experience`.
- **LinkedIn scraping for industry contacts is not implemented** for the
  same reason (ToS + it needs per-target authorization); the directory is
  manual-entry only, per the brief.
- **Brand colors are the real SRM navy (`#0C4DA2`) and gold (`#E4B316`)**,
  pulled from `srmist.edu.in`'s computed styles, with Source Sans Pro to
  match their body font (`src/app/globals.css`, `src/app/layout.tsx`). The
  real logo lives at `public/srm-logo.png` and doubles as the app icon
  (`src/app/icon.png`).
- No `supabase gen types` output is checked in — link the project with the
  Supabase CLI and run it once for full type safety; `src/lib/types.ts` is a
  hand-written stand-in.

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Auth (SSR) for Next.js](https://supabase.com/docs/guides/auth/server-side/nextjs)
- [Supabase Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
