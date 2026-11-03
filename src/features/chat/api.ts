// The group chat for one date.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import type { Tables } from '@/lib/database.types';
import { must } from '@/lib/query';
import { supabase } from '@/lib/supabase';

export type ChatMessage = Tables<'chat_messages'>;

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

/** Live updates: refetch when anyone posts or removes a message in this date's chat. */
export function useLiveChat(sessionId: string) {
  const client = useQueryClient();
  useEffect(() => {
    const channel = supabase
      .channel(`chat:${sessionId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'chat_messages', filter: `session_id=eq.${sessionId}` },
        () => client.invalidateQueries({ queryKey: ['chat', sessionId] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId, client]);
}
