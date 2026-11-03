-- Scheduled jobs, live chat, profile photos, and the starter instrument and genre lists.

-- Scheduled jobs (pg_cron) ---------------------------------------------------------
create extension if not exists pg_cron with schema pg_catalog;

select cron.schedule('build-repeating-dates', '15 10 * * *', $$select private.generate_all_sessions()$$);
select cron.schedule('send-reminders', '*/5 * * * *', $$select private.run_reminders()$$);

-- Live chat: Supabase Realtime streams new messages, still filtered by the chat policies.
alter publication supabase_realtime add table public.chat_messages;

-- Profile photos ------------------------------------------------------------------------
-- Public to view (like any profile photo); each person writes only inside their own folder.
-- A new photo replaces the old one at the same path, so no separate remove step is needed.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 5242880, array['image/jpeg', 'image/png', 'image/webp']);

create policy "you upload your own photo" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "you replace your own photo" on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- Starter lists (editable in the dashboard) ----------------------------------------------
insert into public.instruments (name) values
  ('Vocals'), ('Guitar'), ('Bass'), ('Upright bass'), ('Drums'), ('Percussion'), ('Piano'),
  ('Keys'), ('Organ'), ('Synth'), ('Saxophone'), ('Trumpet'), ('Trombone'), ('Clarinet'),
  ('Flute'), ('Violin'), ('Viola'), ('Cello'), ('Harmonica'), ('Banjo'), ('Mandolin'),
  ('Ukulele'), ('Accordion'), ('Turntables'), ('Electronics'), ('Other');

insert into public.genres (name) values
  ('Jazz standards'), ('Bebop'), ('Latin jazz'), ('Funk'), ('Soul'), ('R&B'), ('Blues'),
  ('Rock'), ('Indie'), ('Folk'), ('Bluegrass'), ('Old-time'), ('Country'), ('Hip-hop'),
  ('Gospel'), ('Reggae'), ('Afrobeat'), ('Brazilian'), ('Classical'), ('Electronic'),
  ('Free improv'), ('Experimental'), ('Noise'), ('World'), ('Anything goes');
