// Who is signed in, and their profile. Browsing works signed out; RSVP and posting need a sign-in.
import type { Session } from '@supabase/supabase-js';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import type { Tables } from '@/lib/database.types';
import { supabase } from '@/lib/supabase';

export type Profile = Tables<'profiles'>;

type Auth = {
  ready: boolean;
  userId: string | null;
  email: string | null;
  profile: Profile | null;
};

const AuthContext = createContext<Auth>({ ready: false, userId: null, email: null, profile: null });

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((event, next) => {
      setSession(next);
      // A different person may now be looking: nothing cached for the last one should show.
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') queryClient.clear();
    });
    return () => data.subscription.unsubscribe();
  }, [queryClient]);

  const userId = session?.user.id ?? null;
  const profile = useQuery({
    queryKey: ['profile', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', userId!).single();
      if (error) throw error;
      return data;
    },
  });

  const ready = session !== undefined && (!userId || !profile.isPending);
  return (
    <AuthContext.Provider
      value={{ ready, userId, email: session?.user.email ?? null, profile: profile.data ?? null }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
