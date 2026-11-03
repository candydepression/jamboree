# OneTwoThreeFour (1234)

Where musicians find each other. Find open jams near you today or this week, RSVP as a player or a listener, and host your own.

One codebase for iPhone, Android and the web ([Expo](https://expo.dev) + React Native). The backend is [Supabase](https://supabase.com): Postgres with row-level security, database functions, scheduled jobs, Realtime chat, Storage and an Edge Function.

## How it's built

```
src/app/          Screens (file-based routes)
  (tabs)/         Explore (map + list), Going, Post, Inbox, Me
  jam/[id]        Jam page: dates, RSVP, address once you're in, who's going
  session/[id]/   Host requests, group chat for one date
  invite/[token]  Invite-only jam links
  sign-in, onboarding
src/components/   UI kit (ui.tsx), jam card, map (Leaflet on web; Mapbox later), drum kit art
src/lib/          api.ts (every Supabase call, as React Query hooks), auth, dates, repeat rules
supabase/
  migrations/     The whole database, in order: schema, privacy rules, functions, jobs, indexes
  functions/      delete-account Edge Function
  seed.sql        Made-up Seattle people and jams (test project only)
  tests/          Privacy checks, run against the seeded test project
```

**Privacy lives in the database, not the app.** Tables are closed by row-level security, and the
sensitive reads go through functions that decide what each person may see:

- The map shows a 1-mile circle. The pin sits 0.15 to 0.75 miles from the real spot, moved by the database, so the app never handles the real point.
- The exact address shows only to the host and to people confirmed for that date, and disappears once the date has passed.
- On approval and invite-only jams, the host shows as first name only until you're let in.
- Chat is per date, for the host and confirmed guests only. Messages can be removed, never rewritten.
- Repeating jams use calendar rules (weekly, every other week, 2nd Tuesday, last Friday...). The database creates the next 8 weeks of dates and tops them up nightly.

## Run it

```bash
npm install
cp .env.example .env    # fill in the Supabase URL and publishable key
npm run web             # or: npm run ios / npm run android (Expo Go)
npm run check           # type check, lint, unit tests
npm run build:web       # static web build in dist/
```

`.env` needs only public values: the project URL and the publishable (anon) key. Never put the
service role key in the app. The Edge Function reads it from Supabase's own environment.

**Test mode** (`EXPO_PUBLIC_TEST_MODE=1`) lets you sign in as any of the made-up people on the sign-in
screen. They share one test-only password, `EXPO_PUBLIC_TEST_PASSWORD`, set when seeding. Use this
only with the test project.

## Database

Apply `supabase/migrations/*.sql` in order, then deploy `supabase/functions/delete-account`.
On the test project only: run `supabase/seed.sql`, then `supabase/tests/privacy_test.sql`
(it should report every check passed and roll itself back).

Supabase dashboard setup:
- Auth → Email: the email template must include `{{ .Token }}` so people get a 6-digit code.
- Auth → URL configuration: set the Site URL to wherever the web build is hosted.
- Supabase's built-in email sends only to your own team's addresses. Real sign-ups need a custom SMTP provider.

## Not yet

Mapbox map on phones (needs a Mapbox account), Google and Apple sign-in (need their developer
accounts), push notifications, venue claims UI, photos UI, reports UI.
