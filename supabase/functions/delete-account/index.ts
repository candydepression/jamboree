// Deletes the signed-in person's account. Removing the sign-in cascades to their profile,
// RSVPs, jams and everything else tied to it; chat messages stay as "deleted user".
// Supabase gives every Edge Function its project URL and keys as environment variables.
import { createClient } from 'npm:@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: cors });

  const url = Deno.env.get('SUPABASE_URL')!;
  const jwt = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });

  // Who is asking: verified from their own sign-in token, never from the request body.
  const { data, error } = await admin.auth.getUser(jwt);
  if (error || !data.user) return new Response('Not signed in', { status: 401, headers: cors });

  const removed = await admin.auth.admin.deleteUser(data.user.id);
  if (removed.error) return new Response('Could not delete the account', { status: 500, headers: cors });
  return new Response(JSON.stringify({ deleted: true }), { headers: { ...cors, 'Content-Type': 'application/json' } });
});
