-- OneTwoThreeFour release 1 schema: 26 tables in six groups.
-- Privacy rules live in 20261103000002_security.sql; functions in 20261103000003_functions.sql.

-- Types -----------------------------------------------------------------

create type public.jam_visibility as enum ('public', 'invite_only');
create type public.jam_status as enum ('active', 'cancelled');
-- replaced = retired because the host changed the jam's schedule before anyone RSVP'd.
create type public.session_status as enum ('scheduled', 'skipped', 'cancelled', 'replaced');
create type public.rsvp_status as enum ('confirmed', 'requested', 'declined', 'cancelled');
create type public.rsvp_role as enum ('player', 'listener');
create type public.experience_level as enum ('just_starting', 'some_experience', 'seasoned', 'pro');
create type public.claim_status as enum ('pending', 'approved', 'rejected');
create type public.report_target as enum ('profile', 'jam', 'message');
create type public.report_status as enum ('open', 'actioned', 'dismissed');
create type public.feedback_status as enum ('new', 'triaged', 'done');
create type public.push_kind as enum ('web', 'expo');

-- 1. People ---------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  first_name text not null default '' check (char_length(first_name) <= 40),
  last_initial text check (char_length(last_initial) <= 1),
  stage_name text check (char_length(stage_name) <= 60),
  display_name text generated always as (
    coalesce(
      nullif(trim(stage_name), ''),
      trim(first_name || coalesce(' ' || nullif(upper(last_initial), '') || '.', ''))
    )
  ) stored,
  photo_path text,
  bio text check (char_length(bio) <= 600),
  experience_level public.experience_level,
  links jsonb not null default '[]'::jsonb check (jsonb_typeof(links) = 'array'),
  invited_by uuid references public.profiles (id) on delete set null,
  can_post boolean not null default false,
  is_admin boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.instruments (
  id smallint generated always as identity primary key,
  name text not null unique
);

create table public.genres (
  id smallint generated always as identity primary key,
  name text not null unique
);

create table public.profile_instruments (
  profile_id uuid not null references public.profiles (id) on delete cascade,
  instrument_id smallint not null references public.instruments (id) on delete cascade,
  primary key (profile_id, instrument_id)
);

create table public.profile_genres (
  profile_id uuid not null references public.profiles (id) on delete cascade,
  genre_id smallint not null references public.genres (id) on delete cascade,
  primary key (profile_id, genre_id)
);

-- One-way, like Instagram: profile_id added friend_id.
create table public.friendships (
  profile_id uuid not null references public.profiles (id) on delete cascade,
  friend_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (profile_id, friend_id),
  check (profile_id <> friend_id)
);
create index friendships_friend_idx on public.friendships (friend_id);

create table public.member_invites (
  id uuid primary key default gen_random_uuid(),
  inviter_id uuid not null references public.profiles (id) on delete cascade,
  code text not null unique default upper(encode(extensions.gen_random_bytes(5), 'hex')),
  redeemed_by uuid references public.profiles (id) on delete set null,
  redeemed_at timestamptz,
  created_at timestamptz not null default now()
);
create index member_invites_inviter_idx on public.member_invites (inviter_id);

-- 3. Venues (before jams, which point at them) ------------------------------

create table public.venues (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  neighborhood text,
  website text,
  instagram text,
  claimed_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.venue_claims (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references public.venues (id) on delete cascade,
  claimant_id uuid not null references public.profiles (id) on delete cascade,
  proof_url text,
  proof_note text check (char_length(proof_note) <= 1000),
  status public.claim_status not null default 'pending',
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
create index venue_claims_venue_idx on public.venue_claims (venue_id);
create index venue_claims_claimant_idx on public.venue_claims (claimant_id);

-- 2. Jams -------------------------------------------------------------------

create table public.jams (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references public.profiles (id) on delete cascade,
  venue_id uuid references public.venues (id) on delete set null,
  title text not null check (char_length(title) between 1 and 80),
  description text check (char_length(description) <= 2000),
  vibe text check (char_length(vibe) <= 200),
  neighborhood text,
  visibility public.jam_visibility not null default 'public',
  approval_required boolean not null default false,
  player_cap int check (player_cap > 0),
  listener_cap int check (listener_cap > 0),
  listeners_allowed boolean not null default true,
  -- A calendar recurrence rule (RFC 5545 subset), e.g. FREQ=WEEKLY;BYDAY=TH. Null = happens once.
  repeat_rule text,
  start_time timestamptz not null,
  duration interval not null default interval '3 hours' check (duration > interval '0'),
  timezone text not null default 'America/Los_Angeles',
  reminder_offsets int[] not null default '{4320,1440,120}', -- minutes before: 3 days, 1 day, 2 hours
  fuzzy_lat double precision,
  fuzzy_lng double precision,
  status public.jam_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index jams_host_idx on public.jams (host_id);
create index jams_venue_idx on public.jams (venue_id);

-- The exact address, kept apart so only the host and confirmed guests can read it.
create table public.jam_locations (
  jam_id uuid primary key references public.jams (id) on delete cascade,
  place_name text,
  address text not null,
  lat double precision not null check (lat between -90 and 90),
  lng double precision not null check (lng between -180 and 180)
);

create table public.jam_sessions (
  id uuid primary key default gen_random_uuid(),
  jam_id uuid not null references public.jams (id) on delete cascade,
  -- The date the repeat rule produced. starts_at differs only when the host moved this one date.
  original_starts_at timestamptz not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status public.session_status not null default 'scheduled',
  override_note text check (char_length(override_note) <= 300),
  created_at timestamptz not null default now(),
  unique (jam_id, original_starts_at),
  check (ends_at > starts_at)
);
create index jam_sessions_starts_idx on public.jam_sessions (starts_at);

create table public.jam_genres (
  jam_id uuid not null references public.jams (id) on delete cascade,
  genre_id smallint not null references public.genres (id) on delete cascade,
  primary key (jam_id, genre_id)
);

create table public.jam_instruments_wanted (
  jam_id uuid not null references public.jams (id) on delete cascade,
  instrument_id smallint not null references public.instruments (id) on delete cascade,
  primary key (jam_id, instrument_id)
);

-- 4. Going to a jam -----------------------------------------------------------

create table public.rsvps (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.jam_sessions (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  role public.rsvp_role not null default 'player',
  status public.rsvp_status not null,
  note text check (char_length(note) <= 500),
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  unique (session_id, profile_id)
);
create index rsvps_profile_idx on public.rsvps (profile_id);

create table public.jam_invites (
  id uuid primary key default gen_random_uuid(),
  jam_id uuid not null references public.jams (id) on delete cascade,
  token text not null unique default encode(extensions.gen_random_bytes(18), 'hex'),
  created_by uuid not null references public.profiles (id) on delete cascade,
  invited_profile_id uuid references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);
create index jam_invites_jam_idx on public.jam_invites (jam_id);

create table public.jam_invite_access (
  jam_id uuid not null references public.jams (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  invite_id uuid references public.jam_invites (id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (jam_id, profile_id)
);
create index jam_invite_access_profile_idx on public.jam_invite_access (profile_id);

create table public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.jam_sessions (id) on delete cascade,
  author_id uuid references public.profiles (id) on delete set null, -- null = deleted user
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index chat_messages_session_idx on public.chat_messages (session_id, created_at);

-- 5. Staying in touch ---------------------------------------------------------

create table public.follows (
  id uuid primary key default gen_random_uuid(),
  follower_id uuid not null references public.profiles (id) on delete cascade,
  followed_profile_id uuid references public.profiles (id) on delete cascade,
  followed_jam_id uuid references public.jams (id) on delete cascade,
  created_at timestamptz not null default now(),
  check (num_nonnulls(followed_profile_id, followed_jam_id) = 1),
  check (follower_id <> followed_profile_id)
);
create unique index follows_profile_uq on public.follows (follower_id, followed_profile_id) where followed_profile_id is not null;
create unique index follows_jam_uq on public.follows (follower_id, followed_jam_id) where followed_jam_id is not null;
create index follows_followed_profile_idx on public.follows (followed_profile_id);
create index follows_followed_jam_idx on public.follows (followed_jam_id);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  type text not null,
  payload jsonb not null default '{}'::jsonb,
  push_sent_at timestamptz,
  email_sent_at timestamptz,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_profile_idx on public.notifications (profile_id, created_at desc);

create table public.notification_prefs (
  profile_id uuid not null references public.profiles (id) on delete cascade,
  type text not null,
  push_on boolean not null default true,
  email_on boolean not null default true,
  primary key (profile_id, type)
);

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  kind public.push_kind not null,
  endpoint text not null unique,
  keys jsonb,
  created_at timestamptz not null default now()
);
create index push_subscriptions_profile_idx on public.push_subscriptions (profile_id);

create table public.reminder_log (
  session_id uuid not null references public.jam_sessions (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  offset_minutes int not null,
  sent_at timestamptz not null default now(),
  primary key (session_id, profile_id, offset_minutes)
);

-- 6. Safety and feedback ------------------------------------------------------

create table public.blocks (
  blocker_id uuid not null references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);
create index blocks_blocked_idx on public.blocks (blocked_id);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references public.profiles (id) on delete set null,
  target_type public.report_target not null,
  target_id uuid not null,
  reason text not null,
  note text check (char_length(note) <= 2000),
  status public.report_status not null default 'open',
  created_at timestamptz not null default now()
);

create table public.feedback (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles (id) on delete set null,
  screen text,
  message text not null check (char_length(message) between 1 and 4000),
  app_version text,
  status public.feedback_status not null default 'new',
  tags text[] not null default '{}',
  created_at timestamptz not null default now()
);

-- Housekeeping ------------------------------------------------------------------

create function public.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();
create trigger jams_touch before update on public.jams
  for each row execute function public.touch_updated_at();
