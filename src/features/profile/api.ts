// Your profile, posting invites, feedback and your account.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { APP_VERSION } from '@/lib/config';
import type { Enums } from '@/lib/database.types';
import { must } from '@/lib/query';
import { supabase } from '@/lib/supabase';

export type Experience = Enums<'experience_level'>;

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
      must(await supabase.from('feedback').insert({ profile_id: me, message: v.message, screen: v.screen, app_version: APP_VERSION }));
    },
  });
}

/** Runs in the delete-account Edge Function, which removes the sign-in and, with it, everything tied to it. */
export async function deleteMyAccount() {
  const { error } = await supabase.functions.invoke('delete-account', { method: 'POST' });
  if (error) throw new Error('Could not delete your account. Try again, or send feedback.');
  await supabase.auth.signOut();
}
