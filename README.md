# OneTwoThreeFour (1234)

Where musicians find each other. Find open jams near you today or this week, RSVP as a player or a listener, and host your own.

One codebase for iPhone, Android and the web ([Expo](https://expo.dev) + React Native). The backend is [Supabase](https://supabase.com): Postgres with row-level security, database functions, scheduled jobs, Realtime chat, Storage and an Edge Function.

## How it's built

```
src/
  app/              Screens, one file per route (Expo Router). Thin: layout and wiring only.
    (tabs)/         Explore (map + list), Going, Post, Inbox, Me
    jam/[id]        Jam page: dates, RSVP, address once you're in, who's going
    session/[id]/   Host requests, group chat for one date
    invite/[token]  Invite-only jam links
  features/         One folder per area of the product. Each owns its data hooks (api.ts) and components.
    auth/           Sign-in, the signed-in person and their profile, test people
    jams/           Browse, jam page data, posting, the map, jam cards
    rsvps/          RSVP, cancel, host approve or decline
    chat/           Messages and live updates
    inbox/          Notices and their wording
    profile/        Profile edits, posting invites, feedback, delete account
  ui/               Design system: theme (colors, type, spacing), Text, layout, controls, art
  lib/              Shared plumbing: Supabase client, config, dates, repeat rules, generated DB types
supabase/
  migrations/       The whole database, in order: schema, privacy rules, functions, jobs, indexes, lockdown
  functions/        delete-account Edge Function
  seed.sql          Made-up Seattle people and jams (test project only)
  tests/            Privacy checks: act as each kind of person and check what they can see
scripts/test-db.sh  Builds a throwaway local database from the migrations and runs the checks
.github/            CI, deploys, dependency updates, PR template
```

**Rules the linter enforces:** screens never call Supabase directly. Every read and write goes
through a feature's `api.ts`, so there's one place to change each query. Imports are grouped and sorted.

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
npm run test:db         # privacy checks on a local database (needs Docker)
npm run build:web       # static web build in dist/
npm run types:db        # regenerate src/lib/database.types.ts after a schema change
```

`.env` needs only public values: the project URL and the publishable (anon) key. Never put the
service role key in the app. The Edge Function reads it from Supabase's own environment.

**Test mode** (`EXPO_PUBLIC_TEST_MODE=1`) lets you sign in as any of the made-up people on the sign-in
screen. They share one test-only password, set in `supabase/seed.sql`. Use this only with the test project.

## CI/CD

| Workflow | When | What |
| --- | --- | --- |
| `ci.yml` | Every PR and push to main | Types, lint, unit tests and web build; migrations, seed and privacy checks on a fresh database |
| `deploy-web.yml` | Push to main | Publishes the test web app to GitHub Pages |
| `deploy-db.yml` | By hand, from the Actions tab | Applies new migrations and the Edge Function to a Supabase project |
| Dependabot | Weekly | Update PRs for libraries and actions (Expo upgrades are done on purpose, as a set) |

Changes go in on a branch, through a pull request, and merge only when CI is green.

## Database

Every change to the database is a new file in `supabase/migrations/`. Never edit a migration that
has already been applied to the live project. `deploy-db.yml` applies them. It needs these settings
in a GitHub environment: `SUPABASE_ACCESS_TOKEN` and `SUPABASE_DB_PASSWORD` (secrets) and
`SUPABASE_PROJECT_ID` (variable). The test project was first set up by hand, so before its first
automated deploy, mark the existing files as applied once:
`supabase migration repair --status applied 20261103000001 20261103000002 20261103000003 20261103000004 20261103000005`.

Supabase dashboard setup:
- Auth → Email: the email template must include `{{ .Token }}` so people get a 6-digit code.
- Auth → URL configuration: set the Site URL to wherever the web build is hosted.
- Supabase's built-in email sends only to your own team's addresses. Real sign-ups need a custom SMTP provider.

## Not yet

Mapbox map on phones (needs a Mapbox account), Google and Apple sign-in (need their developer
accounts), push notifications, venue claims UI, photos UI, reports UI.
