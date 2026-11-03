-- Functions the app calls (public schema, exposed as RPC) and the private machinery behind them:
-- repeating dates, the fuzzy map circle, notifications and reminders.

-- Private building blocks --------------------------------------------------------

-- Name shown for a jam's host. On approval or invite-only jams, people who are not
-- confirmed yet see only a first name (or stage name).
create function private.host_label(p_jam uuid) returns text
language sql stable security definer set search_path = '' as $$
  select case
    when j.host_id = (select auth.uid())
      or not (j.approval_required or j.visibility = 'invite_only')
      or exists (select 1 from public.rsvps r join public.jam_sessions s on s.id = r.session_id
                 where s.jam_id = j.id and r.profile_id = (select auth.uid()) and r.status = 'confirmed')
    then p.display_name
    else coalesce(nullif(trim(p.stage_name), ''), p.first_name)
  end
  from public.jams j join public.profiles p on p.id = j.host_id
  where j.id = p_jam
$$;

create function private.confirmed_count(p_session uuid, p_role public.rsvp_role) returns int
language sql stable security definer set search_path = '' as $$
  select count(*)::int from public.rsvps
  where session_id = p_session and role = p_role and status = 'confirmed'
$$;

create function private.notify(p_profile uuid, p_type text, p_payload jsonb) returns void
language sql security definer set search_path = '' as $$
  insert into public.notifications (profile_id, type, payload) values (p_profile, p_type, p_payload)
$$;

-- Sessions someone was at after they ended: confirmed RSVPs, plus jams they hosted.
create function private.attended_sessions(p_profile uuid) returns table (session_id uuid)
language sql stable security definer set search_path = '' as $$
  select r.session_id
  from public.rsvps r join public.jam_sessions s on s.id = r.session_id
  where r.profile_id = p_profile and r.status = 'confirmed' and s.ends_at < now()
  union
  select s.id
  from public.jam_sessions s join public.jams j on j.id = s.jam_id
  where j.host_id = p_profile and s.status = 'scheduled' and s.ends_at < now()
$$;

-- Everyone someone "knows": friends they added, plus people they played a past session with.
create function private.acquaintances(p_profile uuid) returns table (profile_id uuid)
language sql stable security definer set search_path = '' as $$
  select f.friend_id from public.friendships f where f.profile_id = p_profile
  union
  select r.profile_id
  from private.attended_sessions(p_profile) a
  join public.rsvps r on r.session_id = a.session_id and r.status = 'confirmed'
  where r.profile_id <> p_profile
  union
  select j.host_id
  from private.attended_sessions(p_profile) a
  join public.jam_sessions s on s.id = a.session_id
  join public.jams j on j.id = s.jam_id
  where j.host_id <> p_profile
$$;

-- Repeating dates ------------------------------------------------------------------
-- Supports the parts of the calendar standard (RFC 5545) the app offers:
-- FREQ=DAILY|WEEKLY|MONTHLY, INTERVAL, BYDAY (MO..SU, with 1TU / -1FR for monthly), COUNT, UNTIL.

create function private.rrule_part(p_rule text, p_key text) returns text
language sql immutable set search_path = '' as $$
  select substring(';' || upper(p_rule) || ';' from ';' || p_key || '=([^;]*);')
$$;

create function private.rrule_matches(p_rule text, p_base date, p_day date) returns boolean
language plpgsql immutable set search_path = '' as $$
declare
  codes constant text[] := array['MO','TU','WE','TH','FR','SA','SU'];
  freq text := private.rrule_part(p_rule, 'FREQ');
  step int := coalesce(nullif(private.rrule_part(p_rule, 'INTERVAL'), '')::int, 1);
  byday text[] := string_to_array(nullif(private.rrule_part(p_rule, 'BYDAY'), ''), ',');
  dow int := extract(isodow from p_day)::int;
  dom int := extract(day from p_day)::int;
  last_dom int := extract(day from (date_trunc('month', p_day) + interval '1 month - 1 day'))::int;
  months int;
  entry text;
  ord int;
begin
  if p_day < p_base or step < 1 then
    return false;
  end if;

  if freq = 'DAILY' then
    return (p_day - p_base) % step = 0;

  elsif freq = 'WEEKLY' then
    if ((p_day - (p_base - (extract(isodow from p_base)::int - 1))) / 7) % step <> 0 then
      return false;
    end if;
    if byday is null then
      return dow = extract(isodow from p_base)::int;
    end if;
    return codes[dow] = any (byday);

  elsif freq = 'MONTHLY' then
    months := (extract(year from p_day) - extract(year from p_base))::int * 12
            + (extract(month from p_day) - extract(month from p_base))::int;
    if months % step <> 0 then
      return false;
    end if;
    if byday is null then
      return dom = extract(day from p_base)::int;
    end if;
    foreach entry in array byday loop
      if right(entry, 2) = codes[dow] then
        ord := nullif(left(entry, length(entry) - 2), '')::int;
        if ord is null
           or (ord > 0 and (dom - 1) / 7 + 1 = ord)
           or (ord < 0 and (last_dom - dom) / 7 + 1 = -ord) then
          return true;
        end if;
      end if;
    end loop;
    return false;
  end if;

  return false;
end $$;

-- Creates a jam's sessions up to 8 weeks ahead. Dates the host skipped or moved are kept,
-- because each session remembers the date the rule produced (original_starts_at).
-- A date retired by a schedule change comes back if the new schedule produces it again.
create function private.generate_sessions(p_jam uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  j public.jams;
  local_start timestamp;
  base date;
  day date;
  horizon date;
  until_day date;
  max_count int;
  n int := 0;
  occurs timestamptz;
begin
  select * into j from public.jams where id = p_jam;
  if not found or j.status <> 'active' then
    return;
  end if;

  if coalesce(trim(j.repeat_rule), '') = '' then
    insert into public.jam_sessions as s (jam_id, original_starts_at, starts_at, ends_at)
    values (j.id, j.start_time, j.start_time, j.start_time + j.duration)
    on conflict (jam_id, original_starts_at) do update set status = 'scheduled'
      where s.status = 'replaced';
    return;
  end if;

  local_start := j.start_time at time zone j.timezone;
  base := local_start::date;
  horizon := (now() at time zone j.timezone)::date + 56;
  until_day := nullif(left(private.rrule_part(j.repeat_rule, 'UNTIL'), 8), '')::date;
  max_count := nullif(private.rrule_part(j.repeat_rule, 'COUNT'), '')::int;
  day := base;

  while day <= horizon and (until_day is null or day <= until_day) loop
    if private.rrule_matches(j.repeat_rule, base, day) then
      n := n + 1;
      exit when max_count is not null and n > max_count;
      -- Same wall-clock time every date, so daylight saving never shifts a jam.
      occurs := (day + local_start::time) at time zone j.timezone;
      if occurs + j.duration > now() then
        insert into public.jam_sessions as s (jam_id, original_starts_at, starts_at, ends_at)
        values (j.id, occurs, occurs, occurs + j.duration)
        on conflict (jam_id, original_starts_at) do update set status = 'scheduled'
          where s.status = 'replaced';
      end if;
    end if;
    day := day + 1;
  end loop;
end $$;

create function private.generate_all_sessions() returns void
language sql security definer set search_path = '' as $$
  select private.generate_sessions(id) from public.jams where status = 'active' and repeat_rule is not null
$$;

-- When a jam's schedule changes, rebuild the future dates nobody has touched or RSVP'd to.
create function private.on_jam_schedule_change() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'UPDATE' then
    if new.status = 'cancelled' and old.status <> 'cancelled' then
      update public.jam_sessions set status = 'cancelled'
      where jam_id = new.id and starts_at > now() and status = 'scheduled';
      return new;
    end if;
    -- Future dates nobody touched or RSVP'd to are retired, not erased, so there's a history.
    update public.jam_sessions s set status = 'replaced'
    where s.jam_id = new.id and s.starts_at > now() and s.status = 'scheduled'
      and s.starts_at = s.original_starts_at and s.override_note is null
      and not exists (select 1 from public.rsvps r where r.session_id = s.id);
  end if;
  perform private.generate_sessions(new.id);
  return new;
end $$;

create trigger jams_sessions_insert after insert on public.jams
  for each row execute function private.on_jam_schedule_change();
create trigger jams_sessions_update
  after update of start_time, duration, repeat_rule, timezone, status on public.jams
  for each row execute function private.on_jam_schedule_change();

-- New public jam from a host you follow.
create function private.on_jam_created() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.visibility = 'public' then
    insert into public.notifications (profile_id, type, payload)
    select f.follower_id, 'new_jam_from_followed',
           jsonb_build_object('jam_id', new.id, 'title', new.title, 'starts_at', new.start_time)
    from public.follows f
    where f.followed_profile_id = new.host_id
      and not private.is_blocked_between(f.follower_id, new.host_id);
  end if;
  return new;
end $$;

create trigger jams_notify_followers after insert on public.jams
  for each row execute function private.on_jam_created();

-- A date was cancelled, skipped or moved: tell everyone who is in or waiting.
create function private.on_session_change() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  kind text;
begin
  if new.status in ('cancelled', 'skipped') and old.status = 'scheduled' then
    kind := 'session_cancelled';
  elsif new.starts_at <> old.starts_at or new.ends_at <> old.ends_at then
    kind := 'session_changed';
  else
    return new;
  end if;

  insert into public.notifications (profile_id, type, payload)
  select r.profile_id, kind,
         jsonb_build_object('session_id', new.id, 'jam_id', new.jam_id, 'title', j.title,
                            'starts_at', new.starts_at, 'note', new.override_note)
  from public.rsvps r join public.jams j on j.id = new.jam_id
  where r.session_id = new.id and r.status in ('confirmed', 'requested');
  return new;
end $$;

create trigger jam_sessions_notify after update on public.jam_sessions
  for each row execute function private.on_session_change();

-- The fuzzy circle ---------------------------------------------------------------------
-- When the host saves an address, the database moves the map pin to a random spot
-- 0.15 to 0.75 miles away. The map draws a 1-mile circle around that spot, so the real
-- place is always inside it but never at its center. The app never handles the real point.

create function private.on_location_saved() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  meters double precision := (0.15 + random() * 0.6) * 1609.34;
  bearing double precision := random() * 2 * pi();
begin
  if tg_op = 'UPDATE' and new.lat = old.lat and new.lng = old.lng then
    return new;
  end if;
  update public.jams
  set fuzzy_lat = new.lat + (meters * cos(bearing)) / 111320.0,
      fuzzy_lng = new.lng + (meters * sin(bearing)) / (111320.0 * cos(radians(new.lat)))
  where id = new.jam_id;
  return new;
end $$;

create trigger jam_locations_fuzz after insert or update on public.jam_locations
  for each row execute function private.on_location_saved();

-- Venue claims: when you approve one in the dashboard, the claimant becomes the host.
create function private.on_claim_reviewed() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.status = 'approved' and old.status <> 'approved' then
    update public.venues set claimed_by = new.claimant_id where id = new.venue_id;
    update public.jams set host_id = new.claimant_id where venue_id = new.venue_id;
    update public.profiles set can_post = true where id = new.claimant_id;
  end if;
  if new.status <> old.status then
    new.reviewed_at := now();
    perform private.notify(new.claimant_id, 'claim_' || new.status::text,
                           jsonb_build_object('venue_id', new.venue_id));
  end if;
  return new;
end $$;

create trigger venue_claims_review before update on public.venue_claims
  for each row execute function private.on_claim_reviewed();

-- Reminders (run every 5 minutes) --------------------------------------------------------
-- One reminder per person per due moment. Someone who RSVPs late gets only the nearest one.

create function private.run_reminders() returns void
language sql security definer set search_path = '' as $$
  with due as (
    select r.session_id, r.profile_id, o as offset_minutes, s.starts_at, j.id as jam_id, j.title
    from public.rsvps r
    join public.jam_sessions s on s.id = r.session_id
    join public.jams j on j.id = s.jam_id
    cross join lateral unnest(j.reminder_offsets) o
    where r.status = 'confirmed' and s.status = 'scheduled'
      and s.starts_at > now()
      and s.starts_at - make_interval(mins => o) <= now()
      and not exists (select 1 from public.reminder_log l
                      where l.session_id = r.session_id and l.profile_id = r.profile_id
                        and l.offset_minutes = o)
  ), logged as (
    insert into public.reminder_log (session_id, profile_id, offset_minutes)
    select session_id, profile_id, offset_minutes from due
    returning 1
  )
  insert into public.notifications (profile_id, type, payload)
  select distinct on (session_id, profile_id) profile_id, 'reminder',
         jsonb_build_object('session_id', session_id, 'jam_id', jam_id, 'title', title, 'starts_at', starts_at)
  from due
  order by session_id, profile_id, offset_minutes
$$;

-- What the app calls ---------------------------------------------------------------------

-- Map and list: upcoming dates of every jam you can see, optionally inside a map box.
-- With p_mine, only the dates you are hosting, in, or waiting on (the Going tab).
create function public.browse_jams(
  p_from timestamptz default now(),
  p_to timestamptz default now() + interval '7 days',
  p_south double precision default null,
  p_west double precision default null,
  p_north double precision default null,
  p_east double precision default null,
  p_mine boolean default false
) returns table (
  session_id uuid, jam_id uuid, title text, starts_at timestamptz, ends_at timestamptz,
  timezone text, visibility public.jam_visibility, approval_required boolean,
  venue_name text, neighborhood text, fuzzy_lat double precision, fuzzy_lng double precision,
  host_label text, genres text[], wanted text[],
  player_cap int, listener_cap int, listeners_allowed boolean,
  players_in int, listeners_in int, repeats boolean,
  my_status public.rsvp_status, my_role public.rsvp_role, is_host boolean
)
language sql stable security definer set search_path = '' as $$
  select s.id, j.id, j.title, s.starts_at, s.ends_at, j.timezone, j.visibility, j.approval_required,
         v.name, coalesce(j.neighborhood, v.neighborhood), j.fuzzy_lat, j.fuzzy_lng,
         private.host_label(j.id),
         array(select g.name from public.jam_genres jg join public.genres g on g.id = jg.genre_id
               where jg.jam_id = j.id order by g.name),
         array(select i.name from public.jam_instruments_wanted ji join public.instruments i on i.id = ji.instrument_id
               where ji.jam_id = j.id order by i.name),
         j.player_cap, j.listener_cap, j.listeners_allowed,
         private.confirmed_count(s.id, 'player'), private.confirmed_count(s.id, 'listener'),
         j.repeat_rule is not null,
         me.status, me.role, j.host_id = (select auth.uid())
  from public.jam_sessions s
  join public.jams j on j.id = s.jam_id
  left join public.venues v on v.id = j.venue_id
  left join public.rsvps me on me.session_id = s.id and me.profile_id = (select auth.uid())
  where s.status = 'scheduled' and j.status = 'active'
    and s.ends_at > greatest(p_from, now()) and s.starts_at < p_to
    and private.can_see_jam(j.id)
    and (p_south is null or j.fuzzy_lat between p_south and p_north)
    and (p_west is null or j.fuzzy_lng between p_west and p_east)
    and (not p_mine or j.host_id = (select auth.uid()) or me.status in ('confirmed', 'requested'))
  order by s.starts_at
  limit 500
$$;

-- Jam page.
create function public.get_jam(p_jam uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'id', j.id,
    'title', j.title,
    'description', j.description,
    'vibe', j.vibe,
    'visibility', j.visibility,
    'approval_required', j.approval_required,
    'venue', case when v.id is null then null
                  else jsonb_build_object('id', v.id, 'name', v.name, 'website', v.website, 'instagram', v.instagram) end,
    'neighborhood', coalesce(j.neighborhood, v.neighborhood),
    'fuzzy_lat', j.fuzzy_lat,
    'fuzzy_lng', j.fuzzy_lng,
    'host_label', private.host_label(j.id),
    -- The host's profile is linkable only once their full name is shown to you.
    'host_id', case when private.host_label(j.id) = p.display_name then j.host_id end,
    'is_host', j.host_id = (select auth.uid()),
    'timezone', j.timezone,
    'repeat_rule', j.repeat_rule,
    'duration_minutes', (extract(epoch from j.duration) / 60)::int,
    'player_cap', j.player_cap,
    'listener_cap', j.listener_cap,
    'listeners_allowed', j.listeners_allowed,
    'reminder_offsets', j.reminder_offsets,
    'genres', array(select g.name from public.jam_genres jg join public.genres g on g.id = jg.genre_id
                    where jg.jam_id = j.id order by g.name),
    'wanted', array(select i.name from public.jam_instruments_wanted ji join public.instruments i on i.id = ji.instrument_id
                    where ji.jam_id = j.id order by i.name),
    'is_following', exists (select 1 from public.follows f
                            where f.follower_id = (select auth.uid()) and f.followed_jam_id = j.id),
    'sessions', coalesce((
      select jsonb_agg(x order by x ->> 'starts_at')
      from (
        select jsonb_build_object(
          'id', s.id, 'starts_at', s.starts_at, 'ends_at', s.ends_at, 'note', s.override_note,
          'players_in', private.confirmed_count(s.id, 'player'),
          'listeners_in', private.confirmed_count(s.id, 'listener'),
          'my_status', me.status, 'my_role', me.role
        ) as x
        from public.jam_sessions s
        left join public.rsvps me on me.session_id = s.id and me.profile_id = (select auth.uid())
        where s.jam_id = j.id and s.status = 'scheduled' and s.ends_at > now()
        order by s.starts_at
        limit 8
      ) upcoming
    ), '[]'::jsonb)
  )
  from public.jams j
  join public.profiles p on p.id = j.host_id
  left join public.venues v on v.id = j.venue_id
  where j.id = p_jam and private.can_see_jam(j.id)
$$;

-- The exact address: only the host, or someone confirmed for this date before it ends.
create function public.get_address(p_session uuid)
returns table (place_name text, address text, lat double precision, lng double precision)
language sql stable security definer set search_path = '' as $$
  select l.place_name, l.address, l.lat, l.lng
  from public.jam_sessions s
  join public.jams j on j.id = s.jam_id
  join public.jam_locations l on l.jam_id = j.id
  where s.id = p_session
    and (
      j.host_id = (select auth.uid())
      or (s.status = 'scheduled' and s.ends_at > now() and private.is_confirmed_for(s.id))
    )
$$;

-- Who's going. The host sees everyone in or waiting; confirmed guests see who's in.
-- The host is listed first (is_host) so the chat can name them.
create function public.session_people(p_session uuid)
returns table (profile_id uuid, display_name text, role public.rsvp_role, status public.rsvp_status, is_host boolean)
language sql stable security definer set search_path = '' as $$
  select p.id, p.display_name, 'player'::public.rsvp_role, 'confirmed'::public.rsvp_status, true
  from public.profiles p
  where p.id = private.session_host(p_session)
    and (p.id = (select auth.uid()) or private.is_confirmed_for(p_session))
  union all
  (select r.profile_id, p.display_name, r.role, r.status, false
   from public.rsvps r join public.profiles p on p.id = r.profile_id
   where r.session_id = p_session
     and (
       (private.session_host(p_session) = (select auth.uid()) and r.status in ('confirmed', 'requested'))
       or (private.is_confirmed_for(p_session) and r.status = 'confirmed')
     )
   order by r.status, r.created_at)
$$;

-- The host's request list, with what helps decide.
create function public.host_requests(p_session uuid)
returns table (
  rsvp_id uuid, profile_id uuid, display_name text, role public.rsvp_role, note text,
  requested_at timestamptz, instruments text[], experience_level public.experience_level,
  bio text, invited_by_name text, played_together int, is_friend boolean, people_you_both_know int
)
language sql stable security definer set search_path = '' as $$
  select r.id, p.id, p.display_name, r.role, r.note, r.created_at,
         array(select i.name from public.profile_instruments pi join public.instruments i on i.id = pi.instrument_id
               where pi.profile_id = p.id order by i.name),
         p.experience_level, p.bio,
         (select inv.display_name from public.profiles inv where inv.id = p.invited_by),
         (select count(*)::int from private.attended_sessions((select auth.uid())) a
          join private.attended_sessions(p.id) b on b.session_id = a.session_id),
         exists (select 1 from public.friendships f where f.profile_id = (select auth.uid()) and f.friend_id = p.id),
         (select count(*)::int from private.acquaintances((select auth.uid())) a
          join private.acquaintances(p.id) b on b.profile_id = a.profile_id
          where a.profile_id <> p.id and a.profile_id <> (select auth.uid()))
  from public.rsvps r join public.profiles p on p.id = r.profile_id
  where r.session_id = p_session and r.status = 'requested'
    and private.session_host(p_session) = (select auth.uid())
  order by r.created_at
$$;

-- RSVP as a player or a listener. With approval off you're in (if there's room);
-- with approval on, it's a request the host decides.
create function public.rsvp(p_session uuid, p_role public.rsvp_role default 'player', p_note text default null)
returns public.rsvp_status
language plpgsql security definer set search_path = '' as $$
declare
  me uuid := (select auth.uid());
  s public.jam_sessions;
  j public.jams;
  existing public.rsvps;
  cap int;
  result public.rsvp_status;
begin
  if me is null then
    raise exception 'Sign in to RSVP' using errcode = '28000';
  end if;

  -- Lock the date so two last-spot RSVPs cannot both get in.
  select * into s from public.jam_sessions where id = p_session for update;
  if not found or not private.can_see_jam(s.jam_id) then
    raise exception 'Jam not found' using errcode = 'P0002';
  end if;
  select * into j from public.jams where id = s.jam_id;

  if s.status <> 'scheduled' or j.status <> 'active' or s.ends_at <= now() then
    raise exception 'This date is not happening' using errcode = 'P0001';
  end if;
  if j.host_id = me then
    raise exception 'You are hosting this jam' using errcode = 'P0001';
  end if;
  if private.is_blocked_between(j.host_id, me) then
    raise exception 'Jam not found' using errcode = 'P0002';
  end if;
  if p_role = 'listener' and not j.listeners_allowed then
    raise exception 'This jam is for players only' using errcode = 'P0001';
  end if;

  select * into existing from public.rsvps where session_id = p_session and profile_id = me;
  if found and existing.status in ('confirmed', 'requested') and existing.role = p_role then
    return existing.status;
  end if;
  if found and existing.status = 'declined' then
    raise exception 'The host already answered your request for this date' using errcode = 'P0001';
  end if;

  if j.approval_required then
    result := 'requested';
  else
    cap := case p_role when 'player' then j.player_cap else j.listener_cap end;
    if cap is not null and private.confirmed_count(p_session, p_role) >= cap then
      raise exception 'This date is full' using errcode = 'P0001';
    end if;
    result := 'confirmed';
  end if;

  insert into public.rsvps (session_id, profile_id, role, status, note, decided_at)
  values (p_session, me, p_role, result, p_note, case when result = 'confirmed' then now() end)
  on conflict (session_id, profile_id) do update
    set role = excluded.role, status = excluded.status, note = excluded.note,
        decided_at = excluded.decided_at, created_at = now();

  perform private.notify(
    j.host_id,
    case result when 'requested' then 'request_received' else 'rsvp_received' end,
    jsonb_build_object('session_id', p_session, 'jam_id', j.id, 'title', j.title, 'role', p_role,
                       'starts_at', s.starts_at)
  );
  return result;
end $$;

create function public.cancel_rsvp(p_session uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  me uuid := (select auth.uid());
  r public.rsvps;
begin
  update public.rsvps set status = 'cancelled', decided_at = now()
  where session_id = p_session and profile_id = me and status in ('confirmed', 'requested')
  returning * into r;
  if found then
    perform private.notify(private.session_host(p_session), 'rsvp_cancelled',
                           jsonb_build_object('session_id', p_session, 'role', r.role));
  end if;
end $$;

create function public.decide_request(p_rsvp uuid, p_approve boolean) returns public.rsvp_status
language plpgsql security definer set search_path = '' as $$
declare
  r public.rsvps;
  j public.jams;
  s public.jam_sessions;
  cap int;
  result public.rsvp_status := case when p_approve then 'confirmed' else 'declined' end;
begin
  select * into r from public.rsvps where id = p_rsvp;
  if not found or private.session_host(r.session_id) is distinct from (select auth.uid()) then
    raise exception 'Request not found' using errcode = 'P0002';
  end if;
  if r.status <> 'requested' then
    return r.status;
  end if;

  select * into s from public.jam_sessions where id = r.session_id for update;
  select * into j from public.jams where id = s.jam_id;

  if p_approve then
    cap := case r.role when 'player' then j.player_cap else j.listener_cap end;
    if cap is not null and private.confirmed_count(r.session_id, r.role) >= cap then
      raise exception 'This date is full' using errcode = 'P0001';
    end if;
  end if;

  update public.rsvps set status = result, decided_at = now() where id = p_rsvp;
  perform private.notify(
    r.profile_id,
    case when p_approve then 'request_approved' else 'request_declined' end,
    jsonb_build_object('session_id', s.id, 'jam_id', j.id, 'title', j.title, 'starts_at', s.starts_at)
  );
  return result;
end $$;

-- Posting a jam: the jam, its address and its tags in one step, so a half-saved jam never shows.
-- Runs with the poster's own rights, so the posting rules (members with an invite) still apply.
create function public.create_jam(
  p_title text,
  p_start_time timestamptz,
  p_duration_minutes int,
  p_address text,
  p_lat double precision,
  p_lng double precision,
  p_place_name text default null,
  p_neighborhood text default null,
  p_description text default null,
  p_vibe text default null,
  p_visibility public.jam_visibility default 'public',
  p_approval_required boolean default false,
  p_player_cap int default null,
  p_listener_cap int default null,
  p_listeners_allowed boolean default true,
  p_repeat_rule text default null,
  p_timezone text default 'America/Los_Angeles',
  p_genre_ids smallint[] default '{}',
  p_wanted_ids smallint[] default '{}'
) returns uuid
language plpgsql security invoker set search_path = '' as $$
declare
  new_id uuid;
begin
  insert into public.jams (
    host_id, title, description, vibe, neighborhood, visibility, approval_required,
    player_cap, listener_cap, listeners_allowed, repeat_rule, start_time, duration, timezone
  ) values (
    (select auth.uid()), trim(p_title), nullif(trim(p_description), ''), nullif(trim(p_vibe), ''),
    nullif(trim(p_neighborhood), ''), p_visibility, p_approval_required,
    p_player_cap, p_listener_cap, p_listeners_allowed, nullif(trim(p_repeat_rule), ''),
    p_start_time, make_interval(mins => p_duration_minutes), p_timezone
  ) returning id into new_id;

  insert into public.jam_locations (jam_id, place_name, address, lat, lng)
  values (new_id, nullif(trim(p_place_name), ''), trim(p_address), p_lat, p_lng);

  insert into public.jam_genres (jam_id, genre_id) select new_id, unnest(p_genre_ids);
  insert into public.jam_instruments_wanted (jam_id, instrument_id) select new_id, unnest(p_wanted_ids);

  -- Invite-only jams start with one link the host can share.
  if p_visibility = 'invite_only' then
    insert into public.jam_invites (jam_id, created_by) values (new_id, (select auth.uid()));
  end if;
  return new_id;
end $$;

-- Opening an invite link makes an invite-only jam visible to you. Links can be forwarded.
create function public.open_invite(p_token text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  inv public.jam_invites;
begin
  if (select auth.uid()) is null then
    raise exception 'Sign in to open this invite' using errcode = '28000';
  end if;
  select * into inv from public.jam_invites where token = p_token;
  if not found then
    raise exception 'Invite not found' using errcode = 'P0002';
  end if;
  insert into public.jam_invite_access (jam_id, profile_id, invite_id)
  values (inv.jam_id, (select auth.uid()), inv.id)
  on conflict (jam_id, profile_id) do nothing;
  return inv.jam_id;
end $$;

-- Beta posting invites: 5 per member.
create function public.send_member_invite() returns text
language plpgsql security definer set search_path = '' as $$
declare
  me public.profiles;
  new_code text;
begin
  select * into me from public.profiles where id = (select auth.uid());
  if not found or not me.can_post then
    raise exception 'Only members who can post can invite' using errcode = '42501';
  end if;
  if not me.is_admin and (select count(*) from public.member_invites where inviter_id = me.id) >= 5 then
    raise exception 'You have used all 5 invites' using errcode = 'P0001';
  end if;
  insert into public.member_invites (inviter_id) values (me.id) returning code into new_code;
  return new_code;
end $$;

create function public.redeem_member_invite(p_code text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  me uuid := (select auth.uid());
  inv public.member_invites;
begin
  if me is null then
    raise exception 'Not signed in' using errcode = '28000';
  end if;
  select * into inv from public.member_invites where code = upper(trim(p_code)) for update;
  if not found or inv.redeemed_by is not null then
    raise exception 'That invite code is not valid' using errcode = 'P0002';
  end if;
  if inv.inviter_id = me then
    raise exception 'You cannot use your own invite' using errcode = 'P0001';
  end if;
  update public.member_invites set redeemed_by = me, redeemed_at = now() where id = inv.id;
  update public.profiles set can_post = true, invited_by = coalesce(invited_by, inv.inviter_id) where id = me;
end $$;

-- Deleting an account happens in the delete-account Edge Function (supabase/functions),
-- which uses Supabase's admin API to remove the sign-in; everything tied to it cascades.

-- Guard what people can change directly ---------------------------------------------------
-- Tables with no insert/update/delete policy (rsvps, notifications inserts, reminder_log,
-- jam_invite_access, member_invites, venues) are already closed by row-level security; only the
-- functions above write them. These triggers narrow the edits the policies do allow.
-- Functions that need a signed-in person check auth.uid() themselves, so signed-out calls do nothing.

-- Chat: you can remove a message (deleted_at), never rewrite it.
create function private.guard_chat_edit() returns trigger
language plpgsql set search_path = '' as $$
begin
  if current_user in ('authenticated', 'anon') then
    new.body := old.body;
    new.author_id := old.author_id;
    new.session_id := old.session_id;
    new.created_at := old.created_at;
  end if;
  return new;
end $$;

create trigger chat_messages_guard before update on public.chat_messages
  for each row execute function private.guard_chat_edit();

-- Notifications: you can only mark them read.
create function private.guard_notification_edit() returns trigger
language plpgsql set search_path = '' as $$
begin
  if current_user in ('authenticated', 'anon') then
    new := old;
    new.read_at := coalesce(old.read_at, now());
  end if;
  return new;
end $$;

create trigger notifications_guard before update on public.notifications
  for each row execute function private.guard_notification_edit();

-- Dates: a host can skip, cancel, move or annotate one, not reassign it to another jam.
create function private.guard_session_edit() returns trigger
language plpgsql set search_path = '' as $$
begin
  if current_user in ('authenticated', 'anon') then
    new.jam_id := old.jam_id;
    new.original_starts_at := old.original_starts_at;
    new.created_at := old.created_at;
  end if;
  return new;
end $$;

create trigger jam_sessions_guard before update on public.jam_sessions
  for each row execute function private.guard_session_edit();
