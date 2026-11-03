// Reading jams: the map and list, the jam page, the address, who's going, plus posting one.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { DAY_MS, must } from '@/lib/query';
import { supabase } from '@/lib/supabase';

import type { Bounds, JamDetail, NewJam, Option, Place } from './types';

export function useBrowse(days: number, bounds: Bounds | null) {
  return useQuery({
    queryKey: ['browse', days, bounds],
    placeholderData: (previous) => previous,
    queryFn: async () =>
      must(
        await supabase.rpc('browse_jams', {
          p_from: new Date().toISOString(),
          p_to: new Date(Date.now() + days * DAY_MS).toISOString(),
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
      must(await supabase.rpc('browse_jams', { p_to: new Date(Date.now() + 56 * DAY_MS).toISOString(), p_mine: true })),
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

export function useCreateJam() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (jam: NewJam) => must(await supabase.rpc('create_jam', jam)),
    onSuccess: () => client.invalidateQueries({ queryKey: ['browse'] }),
  });
}

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
