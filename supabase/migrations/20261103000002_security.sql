-- Row-level security: who can see and change what.
-- Sensitive reads (jam listings, addresses, attendee lists) go through the functions in
-- 20261103000003_functions.sql, so the tables themselves stay closed to everyone but owners.

-- Helpers ---------------------------------------------------------------------
-- They live in a "private" schema that the API does not expose, so the app cannot call them
-- directly. security definer lets policies look across tables without recursing into RLS.

create schema private;
grant usage on schema private to anon, authenticated;

create function private.is_blocked_between(a uuid, b uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.blocks
    where (blocker_id = a and blocked_id = b) or (blocker_id = b and blocked_id = a)
  )
$$;

create function private.session_host(p_session uuid) returns uuid
language sql stable security definer set search_path = '' as $$
  select j.host_id from public.jam_sessions s join public.jams j on j.id = s.jam_id where s.id = p_session
$$;

create function private.is_confirmed_for(p_session uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.rsvps
    where session_id = p_session and profile_id = (select auth.uid()) and status = 'confirmed'
  )
$$;

-- Can the signed-in person (or an anonymous visitor) see this jam at all?
create function private.can_see_jam(p_jam uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.jams j
    where j.id = p_jam
      and (
        j.host_id = (select auth.uid())
        or (
          not private.is_blocked_between(j.host_id, (select auth.uid()))
          and (
            (j.visibility = 'public' and j.status = 'active')
            or exists (select 1 from public.jam_invite_access a
                       where a.jam_id = j.id and a.profile_id = (select auth.uid()))
            or exists (select 1 from public.rsvps r join public.jam_sessions s on s.id = r.session_id
                       where s.jam_id = j.id and r.profile_id = (select auth.uid())
                         and r.status in ('confirmed', 'requested'))
          )
        )
      )
  )
$$;

-- New sign-ups get an empty profile; the app asks for a name next.
create function private.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, first_name, last_initial)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'first_name', ''),
    nullif(left(coalesce(new.raw_user_meta_data ->> 'last_initial', ''), 1), '')
  );
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function private.handle_new_user();

-- People cannot grant themselves posting rights, admin, or a fake vouch.
create function private.guard_profile_columns() returns trigger
language plpgsql set search_path = '' as $$
begin
  if current_user in ('authenticated', 'anon') then
    new.can_post := old.can_post;
    new.is_admin := old.is_admin;
    new.invited_by := old.invited_by;
  end if;
  return new;
end $$;

create trigger profiles_guard before update on public.profiles
  for each row execute function private.guard_profile_columns();

-- Turn RLS on everywhere ------------------------------------------------------

do $$
declare t text;
begin
  foreach t in array array[
    'profiles','instruments','genres','profile_instruments','profile_genres','friendships',
    'member_invites','venues','venue_claims','jams','jam_locations','jam_sessions','jam_genres',
    'jam_instruments_wanted','rsvps','jam_invites','jam_invite_access','chat_messages','follows',
    'notifications','notification_prefs','push_subscriptions','reminder_log','blocks','reports','feedback'
  ] loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

-- 1. People -------------------------------------------------------------------

create policy "signed-in people see profiles, except across a block" on public.profiles
  for select to authenticated
  using (not private.is_blocked_between(id, (select auth.uid())));

create policy "you edit your own profile" on public.profiles
  for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy "lists are public" on public.instruments for select to anon, authenticated using (true);
create policy "lists are public" on public.genres for select to anon, authenticated using (true);

create policy "signed-in people see instruments people play" on public.profile_instruments
  for select to authenticated using (true);
create policy "you add your own instruments" on public.profile_instruments
  for insert to authenticated with check (profile_id = (select auth.uid()));
create policy "you remove your own instruments" on public.profile_instruments
  for delete to authenticated using (profile_id = (select auth.uid()));

create policy "signed-in people see genres people play" on public.profile_genres
  for select to authenticated using (true);
create policy "you add your own genres" on public.profile_genres
  for insert to authenticated with check (profile_id = (select auth.uid()));
create policy "you remove your own genres" on public.profile_genres
  for delete to authenticated using (profile_id = (select auth.uid()));

create policy "you see friendships you are part of" on public.friendships
  for select to authenticated
  using (profile_id = (select auth.uid()) or friend_id = (select auth.uid()));
create policy "you add friends" on public.friendships
  for insert to authenticated
  with check (profile_id = (select auth.uid()) and not private.is_blocked_between(profile_id, friend_id));
create policy "you remove friends" on public.friendships
  for delete to authenticated using (profile_id = (select auth.uid()));

create policy "inviter and redeemer see an invite" on public.member_invites
  for select to authenticated
  using (inviter_id = (select auth.uid()) or redeemed_by = (select auth.uid()));

-- 3. Venues -------------------------------------------------------------------

create policy "venues are public" on public.venues for select to anon, authenticated using (true);

create policy "you see your own claims" on public.venue_claims
  for select to authenticated using (claimant_id = (select auth.uid()));
create policy "you file a claim" on public.venue_claims
  for insert to authenticated
  with check (claimant_id = (select auth.uid()) and status = 'pending' and reviewed_at is null);

-- 2. Jams -------------------------------------------------------------------
-- Everyone else reads jams through browse_jams() / get_jam(), which hide the host's
-- full name on private jams and never return the address.

create policy "host sees own jams" on public.jams
  for select to authenticated using (host_id = (select auth.uid()));
create policy "members with posting rights create jams" on public.jams
  for insert to authenticated
  with check (
    host_id = (select auth.uid())
    and exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.can_post)
  );
create policy "host edits own jams" on public.jams
  for update to authenticated
  using (host_id = (select auth.uid())) with check (host_id = (select auth.uid()));
create policy "host deletes own jams" on public.jams
  for delete to authenticated using (host_id = (select auth.uid()));

create policy "only the host reads the address table" on public.jam_locations
  for select to authenticated
  using ((select host_id from public.jams where id = jam_id) = (select auth.uid()));
create policy "host sets the address" on public.jam_locations
  for insert to authenticated
  with check ((select host_id from public.jams where id = jam_id) = (select auth.uid()));
create policy "host changes the address" on public.jam_locations
  for update to authenticated
  using ((select host_id from public.jams where id = jam_id) = (select auth.uid()))
  with check ((select host_id from public.jams where id = jam_id) = (select auth.uid()));

create policy "host sees own sessions" on public.jam_sessions
  for select to authenticated using (private.session_host(id) = (select auth.uid()));
create policy "host adds a one-off date" on public.jam_sessions
  for insert to authenticated
  with check ((select host_id from public.jams where id = jam_id) = (select auth.uid()));
create policy "host skips or moves a date" on public.jam_sessions
  for update to authenticated
  using (private.session_host(id) = (select auth.uid()))
  with check (private.session_host(id) = (select auth.uid()));

create policy "tags follow jam visibility" on public.jam_genres
  for select to anon, authenticated using (private.can_see_jam(jam_id));
create policy "host tags genres" on public.jam_genres
  for insert to authenticated
  with check ((select host_id from public.jams where id = jam_id) = (select auth.uid()));
create policy "host untags genres" on public.jam_genres
  for delete to authenticated
  using ((select host_id from public.jams where id = jam_id) = (select auth.uid()));

create policy "tags follow jam visibility" on public.jam_instruments_wanted
  for select to anon, authenticated using (private.can_see_jam(jam_id));
create policy "host tags instruments" on public.jam_instruments_wanted
  for insert to authenticated
  with check ((select host_id from public.jams where id = jam_id) = (select auth.uid()));
create policy "host untags instruments" on public.jam_instruments_wanted
  for delete to authenticated
  using ((select host_id from public.jams where id = jam_id) = (select auth.uid()));

-- 4. Going to a jam -----------------------------------------------------------
-- RSVPs are written only through rsvp(), cancel_rsvp() and decide_request().

create policy "you, the host, and that night's confirmed guests see RSVPs" on public.rsvps
  for select to authenticated
  using (
    profile_id = (select auth.uid())
    or private.session_host(session_id) = (select auth.uid())
    or (status = 'confirmed' and private.is_confirmed_for(session_id))
  );

create policy "host and link creator see invite links" on public.jam_invites
  for select to authenticated
  using (created_by = (select auth.uid()) or (select host_id from public.jams where id = jam_id) = (select auth.uid()));
create policy "host makes invite links" on public.jam_invites
  for insert to authenticated
  with check (
    created_by = (select auth.uid())
    and (select host_id from public.jams where id = jam_id) = (select auth.uid())
  );

create policy "you see the invites you opened" on public.jam_invite_access
  for select to authenticated using (profile_id = (select auth.uid()));

create policy "host and confirmed guests read that night's chat" on public.chat_messages
  for select to authenticated
  using (private.session_host(session_id) = (select auth.uid()) or private.is_confirmed_for(session_id));
create policy "host and confirmed guests post until the day after" on public.chat_messages
  for insert to authenticated
  with check (
    author_id = (select auth.uid())
    and deleted_at is null
    and (private.session_host(session_id) = (select auth.uid()) or private.is_confirmed_for(session_id))
    and exists (select 1 from public.jam_sessions s
                where s.id = session_id and s.ends_at + interval '1 day' > now())
  );
create policy "authors and the host remove messages" on public.chat_messages
  for update to authenticated
  using (author_id = (select auth.uid()) or private.session_host(session_id) = (select auth.uid()))
  with check (author_id = (select auth.uid()) or private.session_host(session_id) = (select auth.uid()));

-- 5. Staying in touch -----------------------------------------------------------

create policy "your follows" on public.follows
  for all to authenticated
  using (follower_id = (select auth.uid())) with check (follower_id = (select auth.uid()));

create policy "your notifications" on public.notifications
  for select to authenticated using (profile_id = (select auth.uid()));
create policy "you mark notifications read" on public.notifications
  for update to authenticated
  using (profile_id = (select auth.uid())) with check (profile_id = (select auth.uid()));

create policy "your notification settings" on public.notification_prefs
  for all to authenticated
  using (profile_id = (select auth.uid())) with check (profile_id = (select auth.uid()));

create policy "your devices" on public.push_subscriptions
  for all to authenticated
  using (profile_id = (select auth.uid())) with check (profile_id = (select auth.uid()));

-- reminder_log: no policies. Only the scheduled job touches it.

-- 6. Safety and feedback --------------------------------------------------------

create policy "your blocks" on public.blocks
  for all to authenticated
  using (blocker_id = (select auth.uid())) with check (blocker_id = (select auth.uid()));

create policy "you see your reports" on public.reports
  for select to authenticated using (reporter_id = (select auth.uid()));
create policy "you file a report" on public.reports
  for insert to authenticated
  with check (reporter_id = (select auth.uid()) and status = 'open');

create policy "you see your feedback" on public.feedback
  for select to authenticated using (profile_id = (select auth.uid()));
create policy "you send feedback" on public.feedback
  for insert to authenticated
  with check (profile_id = (select auth.uid()) and status = 'new' and tags = '{}');

-- Trigger functions are never called directly.
revoke execute on function private.handle_new_user() from public, anon, authenticated;
revoke execute on function private.guard_profile_columns() from public, anon, authenticated;
