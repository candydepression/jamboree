// Every read and write the app makes, in one place. Screens use these hooks, never supabase directly.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { supabase } from './supabase';
import type { Database, Enums, Tables } from './database.types';

type Fns = Database['public']['Functions'];
export type JamListing = Fns['browse_jams']['Returns'][number];
export type RsvpRole = Enums<'rsvp_role'>;
export type RsvpStatus = Enums<'rsvp_status'>;
export type Visibility = Enums<'jam_visibility'>;
export type Experience = Enums<'experience_level'>;
export type Person = Fns['session_people']['Returns'][number];
export type JamRequest = Fns['host_requests']['Returns'][number];
export type Address = Fns['get_address']['Returns'][number];
export type NewJam = Fns['create_jam']['Args'];
export type Notification = Tables<'notifications'>;
export type ChatMessage = Tables<'chat_messages'>;
export type Option = { id: number; name: string };

/** What the jam page gets back (get_jam builds it as JSON). */
export type JamDetail = {
  id: string;
  title: string;
  description: string | null;
  vibe: string | null;
  visibility: Visibility;
  approval_required: boolean;
  venue: { id: string; name: string; website: string | null; instagram: string | null } | null;
  neighborhood: string | null;
  fuzzy_lat: number | null;
  fuzzy_lng: number | null;
  host_label: string;
  host_id: string | null;
  is_host: boolean;
  timezone: string;
  repeat_rule: string | null;
  duration_minutes: number;
  player_cap: number | null;
  listener_cap: number | null;
  listeners_allowed: boolean;
  genres: string[];
  wanted: string[];
  is_following: boolean;
  sessions: SessionSummary[];
};

export type SessionSummary = {
  id: string;
  starts_at: string;
  ends_at: string;
  note: string | null;
  players_in: number;
  listeners_in: number;
  my_status: RsvpStatus | null;
  my_role: RsvpRole | null;
};

export type Bounds = { south: number; west: number; north: number; east: number };

/**
 * Supabase hands back { data, error }; screens want a value or a thrown, readable error.
 * Without an error, data is present (or null on purpose, for maybeSingle and writes).
 */
function must<T>({ data, error }: { data: T | null; error: { message: string } | null }): T {
  if (error) throw new Error(error.message);
  return data as T;
}

const DAY = 86_400_000;

// Browsing ------------------------------------------------------------------------------

export function useBrowse(days: number, bounds: Bounds | null) {
  return useQuery({
    queryKey: ['browse', days, bounds],
    placeholderData: (previous) => previous,
    queryFn: async () =>
      must(
        await supabase.rpc('browse_jams', {
          p_from: new Date().toISOString(),
          p_to: new Date(Date.now() + days * DAY).toISOString(),
          ...(bounds && { p_south: bounds.south, p_west: bounds.west, p_north: bounds.north, p_east: bounds.east }),
        }),
      ),
  });
}

/** Dates you are hosting, in, or waiting on, for the next 8 weeks. */
export function useMyJams(enabled: boolean) {
  return useQuery({
    queryKey: ['browse', 'mine'],
    enabled,
    queryFn: async () =>
      must(await supabase.rpc('browse_jams', { p_to: new Date(Date.now() + 56 * DAY).toISOString(), p_mine: true })),
  });
}

export function useJam(id: string) {
  return useQuery({
    queryKey: ['jam', id],
    queryFn: async () => must(await supabase.rpc('get_jam', { p_jam: id })) as unknown as JamDetail | null,
  });
}

export function useAddress(sessionId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ['address', sessionId],
    enabled: !!sessionId && enabled,
    queryFn: async () => must(await supabase.rpc('get_address', { p_session: sessionId! }))[0] ?? null,
  });
}

export function usePeople(sessionId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ['people', sessionId],
    enabled: !!sessionId && enabled,
    queryFn: async () => must(await supabase.rpc('session_people', { p_session: sessionId! })),
  });
}

export function useInviteLink(jamId: string, enabled: boolean) {
  return useQuery({
    queryKey: ['invite-link', jamId],
    enabled,
    queryFn: async (): Promise<string | null> => {
      const rows = must(await supabase.from('jam_invites').select('token').eq('jam_id', jamId).limit(1));
      return rows[0]?.token ?? null;
    },
  });
}

export function useOptions(table: 'instruments' | 'genres') {
  return useQuery({
    queryKey: ['options', table],
    staleTime: Infinity,
    queryFn: async (): Promise<Option[]> => must(await supabase.from(table).select('id, name').order('name')),
  });
}

// RSVPs and requests ----------------------------------------------------------------------

/** After anything that changes who's going, refresh every view that counts people. */
function useRefreshJams() {
  const client = useQueryClient();
  return () =>
    Promise.all(['browse', 'jam', 'people', 'requests', 'address', 'notifications'].map((key) =>
      client.invalidateQueries({ queryKey: [key] }),
    ));
}

export function useRsvp() {
  const refresh = useRefreshJams();
  return useMutation({
    mutationFn: async (v: { sessionId: string; role: RsvpRole; note?: string }) =>
      must(await supabase.rpc('rsvp', { p_session: v.sessionId, p_role: v.role, p_note: v.note || undefined })),
    onSuccess: refresh,
  });
}

export function useCancelRsvp() {
  const refresh = useRefreshJams();
  return useMutation({
    mutationFn: async (sessionId: string) => must(await supabase.rpc('cancel_rsvp', { p_session: sessionId })),
    onSuccess: refresh,
  });
}

export function useRequests(sessionId: string) {
  return useQuery({
    queryKey: ['requests', sessionId],
    queryFn: async () => must(await supabase.rpc('host_requests', { p_session: sessionId })),
  });
}

export function useDecide() {
  const refresh = useRefreshJams();
  return useMutation({
    mutationFn: async (v: { rsvpId: string; approve: boolean }) =>
      must(await supabase.rpc('decide_request', { p_rsvp: v.rsvpId, p_approve: v.approve })),
    onSuccess: refresh,
  });
}

export function useFollowJam(jamId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (follow: boolean) => {
      const me = (await supabase.auth.getUser()).data.user?.id;
      if (!me) throw new Error('Sign in to follow jams');
      must(
        follow
          ? await supabase.from('follows').insert({ follower_id: me, followed_jam_id: jamId })
          : await supabase.from('follows').delete().eq('follower_id', me).eq('followed_jam_id', jamId),
      );
    },
    onSuccess: () => client.invalidateQueries({ queryKey: ['jam', jamId] }),
  });
}

export async function openInvite(token: string): Promise<string> {
  return must(await supabase.rpc('open_invite', { p_token: token }));
}

// Posting ---------------------------------------------------------------------------------

export function useCreateJam() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (jam: NewJam) => must(await supabase.rpc('create_jam', jam)),
    onSuccess: () => client.invalidateQueries({ queryKey: ['browse'] }),
  });
}

export type Place = { label: string; address: string; neighborhood: string | null; lat: number; lng: number };

/**
 * Address search for the post form. Uses OpenStreetMap's free search until the Mapbox
 * account exists; swap this one function for Mapbox's geocoder then.
 */
export async function searchPlaces(query: string): Promise<Place[]> {
  const url =
    'https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=5&countrycodes=us' +
    '&viewbox=-122.6,47.9,-122.0,47.3&q=' + encodeURIComponent(query);
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error('Address search is not responding. Try again in a moment.');
  const rows: {
    display_name: string;
    name?: string;
    lat: string;
    lon: string;
    address?: Record<string, string>;
  }[] = await res.json();
  return rows.map((r) => ({
    label: r.name || r.display_name.split(',')[0],
    address: r.display_name,
    neighborhood: r.address?.neighbourhood ?? r.address?.suburb ?? r.address?.city_district ?? null,
    lat: Number(r.lat),
    lng: Number(r.lon),
  }));
}

// Chat ------------------------------------------------------------------------------------

export function useChat(sessionId: string) {
  return useQuery({
    queryKey: ['chat', sessionId],
    queryFn: async () =>
      must(
        await supabase
          .from('chat_messages')
          .select('*')
          .eq('session_id', sessionId)
          .order('created_at', { ascending: true })
          .limit(300),
      ),
  });
}

export function useSendMessage(sessionId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (body: string) => {
      const me = (await supabase.auth.getUser()).data.user?.id;
      must(await supabase.from('chat_messages').insert({ session_id: sessionId, author_id: me, body }));
    },
    onSuccess: () => client.invalidateQueries({ queryKey: ['chat', sessionId] }),
  });
}

export function useRemoveMessage(sessionId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) =>
      must(await supabase.from('chat_messages').update({ deleted_at: new Date().toISOString() }).eq('id', id)),
    onSuccess: () => client.invalidateQueries({ queryKey: ['chat', sessionId] }),
  });
}

// Inbox -----------------------------------------------------------------------------------

export function useNotifications(enabled: boolean) {
  return useQuery({
    queryKey: ['notifications'],
    enabled,
    queryFn: async () =>
      must(await supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(100)),
  });
}

export function useMarkAllRead() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async () =>
      must(await supabase.from('notifications').update({ read_at: new Date().toISOString() }).is('read_at', null)),
    onSuccess: () => client.invalidateQueries({ queryKey: ['notifications'] }),
  });
}

// Profile ---------------------------------------------------------------------------------

export type ProfileEdit = {
  first_name: string;
  last_initial: string | null;
  stage_name: string | null;
  bio: string | null;
  experience_level: Experience | null;
  instrumentIds: number[];
};

export function useMyInstruments(userId: string | null) {
  return useQuery({
    queryKey: ['my-instruments', userId],
    enabled: !!userId,
    queryFn: async () =>
      must(await supabase.from('profile_instruments').select('instrument_id').eq('profile_id', userId!)).map(
        (r) => r.instrument_id,
      ),
  });
}

export function useSaveProfile(userId: string | null) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({ instrumentIds, ...fields }: Partial<ProfileEdit>) => {
      if (!userId) throw new Error('Not signed in');
      must(await supabase.from('profiles').update(fields).eq('id', userId));
      if (instrumentIds) {
        must(await supabase.from('profile_instruments').delete().eq('profile_id', userId));
        if (instrumentIds.length) {
          must(
            await supabase
              .from('profile_instruments')
              .insert(instrumentIds.map((instrument_id) => ({ profile_id: userId, instrument_id }))),
          );
        }
      }
    },
    onSuccess: () => Promise.all([
      client.invalidateQueries({ queryKey: ['profile'] }),
      client.invalidateQueries({ queryKey: ['my-instruments'] }),
    ]),
  });
}

export function useMemberInvites(userId: string | null, enabled: boolean) {
  return useQuery({
    queryKey: ['member-invites', userId],
    enabled: !!userId && enabled,
    queryFn: async () =>
      must(
        await supabase
          .from('member_invites')
          .select('code, redeemed_at')
          .eq('inviter_id', userId!)
          .order('created_at'),
      ),
  });
}

export function useNewMemberInvite() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async () => must(await supabase.rpc('send_member_invite')),
    onSuccess: () => client.invalidateQueries({ queryKey: ['member-invites'] }),
  });
}

export function useRedeemInvite() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (code: string) => must(await supabase.rpc('redeem_member_invite', { p_code: code })),
    onSuccess: () => client.invalidateQueries({ queryKey: ['profile'] }),
  });
}

export function useSendFeedback() {
  return useMutation({
    mutationFn: async (v: { message: string; screen: string }) => {
      const me = (await supabase.auth.getUser()).data.user?.id ?? null;
      must(await supabase.from('feedback').insert({ profile_id: me, message: v.message, screen: v.screen, app_version: '0.1.0' }));
    },
  });
}

/** Runs in the delete-account Edge Function, which removes the sign-in and, with it, everything tied to it. */
export async function deleteMyAccount() {
  const { error } = await supabase.functions.invoke('delete-account', { method: 'POST' });
  if (error) throw new Error('Could not delete your account. Try again, or send feedback.');
  await supabase.auth.signOut();
}
