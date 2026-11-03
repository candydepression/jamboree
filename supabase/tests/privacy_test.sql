-- Privacy and RSVP checks against the seeded TEST project.
-- Acts as each made-up person in turn (by setting the role and sign-in claims the API would),
-- then raises an error with the results, so every change it made is rolled back.
-- Run it in the SQL editor or with execute_sql. Expect: "PRIVACY TESTS: N passed, 0 failed".

do $$
declare
  maya uuid := '00000000-0000-4000-a000-000000000001';
  dev  uuid := '00000000-0000-4000-a000-000000000002';
  june uuid := '00000000-0000-4000-a000-000000000003';
  sam  uuid := '00000000-0000-4000-a000-000000000004';
  lee  uuid := '00000000-0000-4000-a000-000000000005';
  home_jam uuid; venue_jam uuid; park_jam uuid; garage_jam uuid;
  next_home uuid; next_venue uuid; next_park uuid; past_session uuid; next_garage uuid;
  sam_rsvp uuid;
  new_jam uuid;
  passed int := 0;
  failed text[] := '{}';
  n int;
  t text;
  j jsonb;
  ok boolean;
begin
  select id into home_jam from public.jams where title like 'Thursday standards%';
  select id into venue_jam from public.jams where title like 'Wednesday jam%';
  select id into park_jam from public.jams where title like 'Sunday folk%';
  select id into garage_jam from public.jams where title = 'Garage noise night';
  select id into next_home from public.jam_sessions where jam_id = home_jam order by starts_at limit 1;
  select id into next_venue from public.jam_sessions where jam_id = venue_jam order by starts_at limit 1;
  select id into next_park from public.jam_sessions where jam_id = park_jam order by starts_at limit 1;
  select id into next_garage from public.jam_sessions where jam_id = garage_jam order by starts_at limit 1;
  select s.id into past_session from public.jam_sessions s join public.jams x on x.id = s.jam_id
    where x.title like 'Pop-up blues%';
  select id into sam_rsvp from public.rsvps where session_id = next_home and profile_id = sam;

  if home_jam is null or next_home is null or past_session is null or sam_rsvp is null then
    raise exception 'Seed data missing: run supabase/seed.sql on the test project first';
  end if;

  -- Anonymous visitor ---------------------------------------------------------------------
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  set local role anon;

  select count(*) into n from public.browse_jams(now(), now() + interval '8 weeks') where jam_id = home_jam;
  if n > 0 then passed := passed + 1; else failed := failed || 'anon can browse public jams'; end if;

  select count(*) into n from public.browse_jams(now(), now() + interval '8 weeks') where jam_id = garage_jam;
  if n = 0 then passed := passed + 1; else failed := failed || 'anon cannot see invite-only jam'; end if;

  select host_label into t from public.browse_jams(now(), now() + interval '8 weeks') where jam_id = home_jam limit 1;
  if t = 'Maya' then passed := passed + 1; else failed := failed || ('anon sees first name only, got ' || coalesce(t, 'null')); end if;

  select count(*) into n from public.jams;
  if n = 0 then passed := passed + 1; else failed := failed || 'anon cannot read jams table'; end if;

  select count(*) into n from public.profiles;
  if n = 0 then passed := passed + 1; else failed := failed || 'anon cannot read profiles'; end if;

  begin
    select count(*) into n from public.get_address(next_home);
  exception when insufficient_privilege then n := 0;
  end;
  if n = 0 then passed := passed + 1; else failed := failed || 'anon cannot see the address'; end if;

  select count(*) into n from public.jam_locations;
  if n = 0 then passed := passed + 1; else failed := failed || 'anon cannot read addresses table'; end if;

  reset role;

  -- Lee: signed in, a stranger to Maya's jam, cannot post ------------------------------------
  perform set_config('request.jwt.claims', json_build_object('sub', lee, 'role', 'authenticated')::text, true);
  set local role authenticated;

  select count(*) into n from public.get_address(next_home);
  if n = 0 then passed := passed + 1; else failed := failed || 'stranger cannot see the address'; end if;

  select count(*) into n from public.session_people(next_home);
  if n = 0 then passed := passed + 1; else failed := failed || 'stranger cannot see who is going'; end if;

  select count(*) into n from public.chat_messages where session_id = next_home;
  if n = 0 then passed := passed + 1; else failed := failed || 'stranger cannot read the chat'; end if;

  select count(*) into n from public.jam_locations;
  if n = 0 then passed := passed + 1; else failed := failed || 'stranger cannot read addresses table'; end if;

  select count(*) into n from public.host_requests(next_home);
  if n = 0 then passed := passed + 1; else failed := failed || 'stranger cannot see host requests'; end if;

  if public.get_jam(garage_jam) is null then passed := passed + 1; else failed := failed || 'stranger cannot open invite-only jam'; end if;

  ok := false;
  begin
    perform public.create_jam('Sneaky', now() + interval '1 day', 60, 'x', 47.6, -122.3);
  exception when insufficient_privilege then ok := true;
  end;
  if ok then passed := passed + 1; else failed := failed || 'member without invite cannot post'; end if;

  update public.profiles set can_post = true, is_admin = true where id = lee;
  select count(*) into n from public.profiles where id = lee and (can_post or is_admin);
  if n = 0 then passed := passed + 1; else failed := failed || 'cannot grant yourself posting rights'; end if;

  ok := false;
  begin
    insert into public.rsvps (session_id, profile_id, status) values (next_home, lee, 'confirmed');
  exception when insufficient_privilege then ok := true;
  end;
  if ok then passed := passed + 1; else failed := failed || 'cannot write RSVPs directly'; end if;

  ok := false;
  begin
    insert into public.chat_messages (session_id, author_id, body) values (next_home, lee, 'hi');
  exception when insufficient_privilege then ok := true;
  end;
  if ok then passed := passed + 1; else failed := failed || 'stranger cannot post in the chat'; end if;

  if public.rsvp(next_park, 'player') = 'confirmed' then passed := passed + 1; else failed := failed || 'open jam RSVP confirms'; end if;
  select count(*) into n from public.get_address(next_park);
  if n = 1 then passed := passed + 1; else failed := failed || 'confirmed guest sees the address'; end if;

  -- Invite link opens the invite-only jam, but it stays players-only.
  perform public.open_invite('test-garage-invite');
  if public.get_jam(garage_jam) is not null then passed := passed + 1; else failed := failed || 'invite link opens the jam'; end if;
  ok := false;
  begin perform public.rsvp(next_garage, 'listener'); exception when raise_exception then ok := true; end;
  if ok then passed := passed + 1; else failed := failed || 'players-only jam refuses listeners'; end if;

  -- Blocking hides the other person's jams.
  insert into public.blocks (blocker_id, blocked_id) values (lee, dev);
  select count(*) into n from public.browse_jams(now(), now() + interval '8 weeks') where jam_id in (venue_jam, park_jam);
  if n = 0 then passed := passed + 1; else failed := failed || 'blocked host''s jams are hidden'; end if;

  reset role;

  -- Sam: asked to join Maya's, not approved yet ------------------------------------------------
  perform set_config('request.jwt.claims', json_build_object('sub', sam, 'role', 'authenticated')::text, true);
  set local role authenticated;

  select count(*) into n from public.get_address(next_home);
  if n = 0 then passed := passed + 1; else failed := failed || 'requester cannot see the address yet'; end if;
  select host_label into t from public.browse_jams(now(), now() + interval '8 weeks') where session_id = next_home;
  if t = 'Maya' then passed := passed + 1; else failed := failed || 'requester sees first name only'; end if;
  select count(*) into n from public.chat_messages where session_id = next_home;
  if n = 0 then passed := passed + 1; else failed := failed || 'requester cannot read the chat'; end if;

  reset role;

  -- June: confirmed for Maya's ---------------------------------------------------------------
  perform set_config('request.jwt.claims', json_build_object('sub', june, 'role', 'authenticated')::text, true);
  set local role authenticated;

  select count(*) into n from public.get_address(next_home);
  if n = 1 then passed := passed + 1; else failed := failed || 'confirmed guest sees the address'; end if;
  select count(*) into n from public.get_address(past_session);
  if n = 0 then passed := passed + 1; else failed := failed || 'address is gone once the date is past'; end if;
  select host_label into t from public.browse_jams(now(), now() + interval '8 weeks') where session_id = next_home;
  if t = 'Maya R.' then passed := passed + 1; else failed := failed || ('confirmed guest sees full host name, got ' || coalesce(t, 'null')); end if;
  select count(*) into n from public.session_people(next_home);
  if n = 2 then passed := passed + 1; else failed := failed || ('guest sees host + confirmed only (2), got ' || n); end if;
  select count(*) into n from public.chat_messages where session_id = next_home;
  if n = 2 then passed := passed + 1; else failed := failed || 'confirmed guest reads the chat'; end if;
  insert into public.chat_messages (session_id, author_id, body) values (next_home, june, 'See you there');
  passed := passed + 1;
  update public.chat_messages set body = 'rewritten' where session_id = next_home and author_id = maya;
  select count(*) into n from public.chat_messages where session_id = next_home and body = 'rewritten';
  if n = 0 then passed := passed + 1; else failed := failed || 'nobody can rewrite a chat message'; end if;

  reset role;

  -- Maya: the host ------------------------------------------------------------------------------
  perform set_config('request.jwt.claims', json_build_object('sub', maya, 'role', 'authenticated')::text, true);
  set local role authenticated;

  select count(*) into n from public.session_people(next_home);
  if n = 3 then passed := passed + 1; else failed := failed || ('host sees host + in + waiting (3), got ' || n); end if;

  select to_jsonb(r) into j from public.host_requests(next_home) r;
  if j ->> 'display_name' = 'Sam T.' then passed := passed + 1; else failed := failed || 'host sees the request'; end if;
  if (j ->> 'played_together')::int = 1 then passed := passed + 1; else failed := failed || ('played together = 1, got ' || coalesce(j ->> 'played_together', 'null')); end if;
  if (j ->> 'people_you_both_know')::int = 1 then passed := passed + 1; else failed := failed || ('people you both know = 1, got ' || coalesce(j ->> 'people_you_both_know', 'null')); end if;
  if j ->> 'invited_by_name' = 'Maya R.' then passed := passed + 1; else failed := failed || 'request shows who vouched'; end if;

  if public.decide_request(sam_rsvp, true) = 'confirmed' then passed := passed + 1; else failed := failed || 'host approves a request'; end if;

  select count(*) into n from public.jams where host_id = maya;
  if n = 2 then passed := passed + 1; else failed := failed || 'host reads own jams'; end if;

  -- Moving a weekly jam to Tuesdays retires the untouched Thursdays but keeps the one people RSVP'd to.
  update public.jams set repeat_rule = 'FREQ=WEEKLY;BYDAY=TU' where id = home_jam;
  select count(*) into n from public.browse_jams(now(), now() + interval '8 weeks') b
    where b.jam_id = home_jam and extract(isodow from b.starts_at at time zone 'America/Los_Angeles') = 2;
  if n >= 6 then passed := passed + 1; else failed := failed || ('moved jam gets new Tuesday dates, got ' || n); end if;
  select count(*) into n from public.browse_jams(now(), now() + interval '8 weeks') b
    where b.jam_id = home_jam and b.session_id <> next_home
      and extract(isodow from b.starts_at at time zone 'America/Los_Angeles') = 4;
  if n = 0 then passed := passed + 1; else failed := failed || ('untouched old Thursdays retired, got ' || n); end if;
  select count(*) into n from public.browse_jams(now(), now() + interval '8 weeks') b where b.session_id = next_home;
  if n = 1 then passed := passed + 1; else failed := failed || 'a date people RSVPd to is kept'; end if;

  reset role;

  -- Sam again, now approved ------------------------------------------------------------------
  perform set_config('request.jwt.claims', json_build_object('sub', sam, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*) into n from public.get_address(next_home);
  if n = 1 then passed := passed + 1; else failed := failed || 'approved guest sees the address'; end if;
  select count(*) into n from public.notifications where type = 'request_approved';
  if n = 1 then passed := passed + 1; else failed := failed || 'approved guest gets a notification'; end if;
  reset role;

  -- Posting creates the jam, its dates and its pin in one step --------------------------------
  perform set_config('request.jwt.claims', json_build_object('sub', dev, 'role', 'authenticated')::text, true);
  set local role authenticated;
  new_jam := public.create_jam('Test post', now() + interval '2 days', 120, '1 Test St', 47.61, -122.33,
                               p_repeat_rule => 'FREQ=WEEKLY;BYDAY=MO,FR');
  select count(*) into n from public.browse_jams(now(), now() + interval '8 weeks') b where b.jam_id = new_jam;
  if n >= 8 then passed := passed + 1; else failed := failed || ('weekly twice jam makes 8 weeks of dates, got ' || n); end if;
  select count(*) into n from public.browse_jams(now(), now() + interval '8 weeks') b
    where b.jam_id = new_jam and b.fuzzy_lat is not null and (b.fuzzy_lat, b.fuzzy_lng) <> (47.61, -122.33);
  if n >= 1 then passed := passed + 1; else failed := failed || 'pin is moved off the real spot'; end if;
  reset role;

  raise exception 'PRIVACY TESTS: % passed, % failed%', passed, coalesce(array_length(failed, 1), 0),
    case when array_length(failed, 1) > 0 then ': ' || array_to_string(failed, '; ') else '' end;
end $$;
