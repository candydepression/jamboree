// Inbox: notices the database writes (requests, approvals, changes, reminders).
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { Tables } from '@/lib/database.types';
import { must } from '@/lib/query';
import { supabase } from '@/lib/supabase';

export type Notification = Tables<'notifications'>;

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
