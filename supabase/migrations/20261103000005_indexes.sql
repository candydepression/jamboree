-- Indexes for foreign keys the Supabase performance advisor flagged, so lookups and
-- account deletions stay fast as the tables grow.
create index if not exists chat_messages_author_idx on public.chat_messages (author_id);
create index if not exists feedback_profile_idx on public.feedback (profile_id);
create index if not exists jam_genres_genre_idx on public.jam_genres (genre_id);
create index if not exists jam_instruments_wanted_instrument_idx on public.jam_instruments_wanted (instrument_id);
create index if not exists jam_invite_access_invite_idx on public.jam_invite_access (invite_id);
create index if not exists jam_invites_created_by_idx on public.jam_invites (created_by);
create index if not exists jam_invites_invited_profile_idx on public.jam_invites (invited_profile_id);
create index if not exists member_invites_redeemed_by_idx on public.member_invites (redeemed_by);
create index if not exists profile_genres_genre_idx on public.profile_genres (genre_id);
create index if not exists profile_instruments_instrument_idx on public.profile_instruments (instrument_id);
create index if not exists profiles_invited_by_idx on public.profiles (invited_by);
create index if not exists reminder_log_profile_idx on public.reminder_log (profile_id);
create index if not exists reports_reporter_idx on public.reports (reporter_id);
create index if not exists venues_claimed_by_idx on public.venues (claimed_by);
