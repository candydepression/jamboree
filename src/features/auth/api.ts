// Signing in and out. Email gets a 6-digit code; test builds can also step in as a made-up person.
import { testPassword } from '@/lib/config';
import { supabase } from '@/lib/supabase';

type Result = { error: { message: string } | null };

export const sendCode = (email: string): Promise<Result> =>
  supabase.auth.signInWithOtp({ email: email.trim(), options: { shouldCreateUser: true } });

export const verifyCode = (email: string, code: string): Promise<Result> =>
  supabase.auth.verifyOtp({ email: email.trim(), token: code.trim(), type: 'email' });

export const signInAsTestPerson = (email: string): Promise<Result> =>
  supabase.auth.signInWithPassword({ email, password: testPassword });

export const signOut = () => supabase.auth.signOut();
