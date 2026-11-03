-- Made-up people and jams for the TEST project only. Never run this on the live project.
-- Every name, venue and address here is invented. Coordinates are inside real Seattle neighborhoods.
--
-- All made-up people share one test-only password (also EXPO_PUBLIC_TEST_PASSWORD in the
-- test build, which offers "sign in as a made-up person"). Override it with
--   select set_config('seed.test_password', '<password>', false);

do $$
declare
  pw text := coalesce(nullif(current_setting('seed.test_password', true), ''), 'made-up-people-only-2026');
  maya uuid := '00000000-0000-4000-a000-000000000001';
  dev  uuid := '00000000-0000-4000-a000-000000000002';
  june uuid := '00000000-0000-4000-a000-000000000003';
  sam  uuid := '00000000-0000-4000-a000-000000000004';
  lee  uuid := '00000000-0000-4000-a000-000000000005';
  rio  uuid := '00000000-0000-4000-a000-000000000006';
  brick uuid := '00000000-0000-4000-b000-000000000001';
  clay  uuid := '00000000-0000-4000-b000-000000000002';
  home_jam uuid; venue_jam uuid; park_jam uuid; garage_jam uuid; past_jam uuid;
  next_home uuid; next_venue uuid; past_session uuid;
  tz text := 'America/Los_Angeles';
  -- The next given weekday at a wall-clock time, in Seattle.
  next_at constant text := $f$
    select ((current_date + ((%s - extract(isodow from current_date)::int + 7) %% 7))::date + time '%s')
           at time zone 'America/Los_Angeles'
  $f$;
  thu_730 timestamptz; wed_800 timestamptz; sun_200 timestamptz; sat_900 timestamptz;
begin
  execute format(next_at, 4, '19:30') into thu_730;
  execute format(next_at, 3, '20:00') into wed_800;
  execute format(next_at, 7, '14:00') into sun_200;
  execute format(next_at, 6, '21:00') into sat_900;

  -- People ------------------------------------------------------------------------------
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change, email_change_token_new
  )
  select '00000000-0000-0000-0000-000000000000', u.id, 'authenticated', 'authenticated', u.email,
         extensions.crypt(pw, extensions.gen_salt('bf')), now(),
         '{"provider":"email","providers":["email"]}',
         jsonb_build_object('first_name', u.first_name, 'last_initial', u.initial),
         now(), now(), '', '', '', ''
  from (values
    (maya, 'maya@test.onetwothreefour.app', 'Maya', 'R'),
    (dev,  'dev@test.onetwothreefour.app',  'Dev',  'P'),
    (june, 'june@test.onetwothreefour.app', 'June', 'K'),
    (sam,  'sam@test.onetwothreefour.app',  'Sam',  'T'),
    (lee,  'lee@test.onetwothreefour.app',  'Lee',  'W'),
    (rio,  'rio@test.onetwothreefour.app',  'Rio',  'S')
  ) as u (id, email, first_name, initial);

  insert into auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
  select gen_random_uuid(), u.id, u.id::text, 'email',
         jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true), now(), now(), now()
  from auth.users u where u.email like '%@test.onetwothreefour.app';

  -- Profiles were created by the sign-up trigger; fill in the rest.
  update public.profiles set can_post = true, is_admin = (id = maya) where id in (maya, dev, rio);
  update public.profiles set invited_by = maya where id in (june, sam);
  update public.profiles set
    bio = case id
      when maya then 'Piano. I host a standards night in my living room. Bring a tune.'
      when dev then 'Bass player and the person behind the Wednesday session at The Brick Room.'
      when june then 'Drummer. Brushes, swing, a bit of funk.'
      when sam then 'Upright bass, three years in. Learning the Real Book one page at a time.'
      when rio then 'Synths, pedals, noise. Garage door open, ears ready.'
    end,
    experience_level = (case id
      when maya then 'seasoned' when dev then 'pro' when june then 'seasoned'
      when sam then 'some_experience' when rio then 'seasoned'
    end)::public.experience_level,
    stage_name = case when id = rio then 'Rio Static' end
  where id in (maya, dev, june, sam, rio);

  insert into public.profile_instruments (profile_id, instrument_id)
  select p, i.id from (values (maya, 'Piano'), (dev, 'Bass'), (june, 'Drums'), (sam, 'Upright bass'),
                              (rio, 'Synth'), (rio, 'Electronics')) as x (p, n)
  join public.instruments i on i.name = x.n;

  insert into public.friendships (profile_id, friend_id) values (june, maya), (maya, june), (sam, dev);

  -- Venues ------------------------------------------------------------------------------
  insert into public.venues (id, name, neighborhood, website, claimed_by) values
    (brick, 'The Brick Room', 'Ballard', null, dev),
    (clay, 'Clay & Coffee', 'Fremont', null, null);

  -- Jams (sessions are created by the database from each repeat rule) ----------------------
  insert into public.jams (host_id, title, vibe, description, neighborhood, approval_required,
                           player_cap, listener_cap, listeners_allowed, repeat_rule, start_time, duration, timezone)
  values (maya, 'Thursday standards at Maya’s', 'Real Book, all levels, coffee on',
          'Living room with an upright piano and a drum kit. Bring your horn and a tune you love.',
          'Capitol Hill', true, 6, 4, true, 'FREQ=WEEKLY;BYDAY=TH', thu_730, interval '3 hours', tz)
  returning id into home_jam;

  insert into public.jams (host_id, venue_id, title, vibe, description, player_cap, listeners_allowed,
                           repeat_rule, start_time, duration, timezone)
  values (dev, brick, 'Wednesday jam at The Brick Room', 'House trio first set, then the stage is yours',
          'Sign up at the bar or RSVP here. Backline provided: drums, bass amp, keys.',
          14, true, 'FREQ=WEEKLY;BYDAY=WE', wed_800, interval '3 hours', tz)
  returning id into venue_jam;

  insert into public.jams (host_id, title, vibe, neighborhood, listeners_allowed, repeat_rule, start_time, duration, timezone)
  values (dev, 'Sunday folk in the park', 'Acoustic only, bring a blanket', 'Wallingford', true,
          'FREQ=WEEKLY;BYDAY=SU', sun_200, interval '2 hours', tz)
  returning id into park_jam;

  insert into public.jams (host_id, title, vibe, neighborhood, visibility, player_cap, listeners_allowed,
                           repeat_rule, start_time, duration, timezone)
  values (rio, 'Garage noise night', 'Loud, weird, friendly', 'Georgetown', 'invite_only', 5, false,
          'FREQ=MONTHLY;BYDAY=-1SA', sat_900, interval '3 hours', tz)
  returning id into garage_jam;

  -- A one-time jam last week, so "played together" and "people you both know" have history.
  insert into public.jams (host_id, title, neighborhood, start_time, duration, timezone)
  values (maya, 'Pop-up blues on the porch', 'Capitol Hill', now() - interval '6 days', interval '2 hours', tz)
  returning id into past_jam;

  -- Addresses (made up). The database moves each map pin into a fuzzy circle.
  insert into public.jam_locations (jam_id, place_name, address, lat, lng) values
    (home_jam, 'Maya’s place', '100 Test Ave E, Seattle, WA', 47.6229, -122.3165),
    (venue_jam, 'The Brick Room', '200 Sample St NW, Seattle, WA', 47.6687, -122.3847),
    (park_jam, 'The big lawn', 'Near the north lawn, Seattle, WA', 47.6456, -122.3344),
    (garage_jam, 'Rio’s garage', '300 Example Way S, Seattle, WA', 47.5480, -122.3210),
    (past_jam, 'Maya’s porch', '100 Test Ave E, Seattle, WA', 47.6229, -122.3165);

  insert into public.jam_genres (jam_id, genre_id)
  select j, g.id from (values (home_jam, 'Jazz standards'), (home_jam, 'Bebop'), (venue_jam, 'Funk'),
                              (venue_jam, 'Soul'), (venue_jam, 'Jazz standards'), (park_jam, 'Folk'),
                              (park_jam, 'Bluegrass'), (garage_jam, 'Noise'), (garage_jam, 'Experimental'),
                              (past_jam, 'Blues')) as x (j, n)
  join public.genres g on g.name = x.n;

  insert into public.jam_instruments_wanted (jam_id, instrument_id)
  select j, i.id from (values (home_jam, 'Saxophone'), (home_jam, 'Trumpet'), (home_jam, 'Upright bass'),
                              (venue_jam, 'Vocals'), (venue_jam, 'Guitar'), (park_jam, 'Banjo'),
                              (park_jam, 'Violin')) as x (j, n)
  join public.instruments i on i.name = x.n;

  insert into public.jam_invites (jam_id, created_by, token)
  values (garage_jam, rio, 'test-garage-invite');

  -- RSVPs ---------------------------------------------------------------------------------
  select id into next_home from public.jam_sessions where jam_id = home_jam order by starts_at limit 1;
  select id into next_venue from public.jam_sessions where jam_id = venue_jam order by starts_at limit 1;
  select id into past_session from public.jam_sessions where jam_id = past_jam limit 1;

  insert into public.rsvps (session_id, profile_id, role, status, note, decided_at) values
    (next_home, june, 'player', 'confirmed', null, now()),
    (next_home, sam, 'player', 'requested', 'Upright bass. Played with June last week!', null),
    (next_venue, june, 'player', 'confirmed', null, now()),
    (next_venue, lee, 'listener', 'confirmed', null, now()),
    (past_session, june, 'player', 'confirmed', null, now() - interval '7 days'),
    (past_session, sam, 'player', 'confirmed', null, now() - interval '7 days');

  insert into public.chat_messages (session_id, author_id, body) values
    (next_home, maya, 'Thursday! I’ll call Autumn Leaves first. Street parking is easy after 7.'),
    (next_home, june, 'Bringing brushes and a cajon.');

  insert into public.member_invites (inviter_id, code) values (maya, 'TESTCODE01');

  insert into public.notifications (profile_id, type, payload)
  values (maya, 'request_received',
          jsonb_build_object('session_id', next_home, 'jam_id', home_jam, 'title', 'Thursday standards at Maya’s',
                             'role', 'player'));
end $$;
