// Going to a jam: RSVP as a player or listener, cancel, and the host's approve or decline.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { RsvpRole } from '@/features/jams/types';
import type { Database } from '@/lib/database.types';
import { must } from '@/lib/query';
import { supabase } from '@/lib/supabase';


export type JamRequest = Database['public']['Functions']['host_requests']['Returns'][number];

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
