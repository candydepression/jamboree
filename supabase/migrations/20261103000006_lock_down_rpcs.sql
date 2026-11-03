-- Signed-out visitors can browse (browse_jams, get_jam) and nothing else. Every other function
-- already checks who is signed in, so this is a second lock on the same door, and it clears the
-- Supabase security advisor's "anon can execute" warnings. The private helpers are not exposed
-- through the API at all; this also stops them being called from anywhere but our policies.

revoke execute on function
  public.rsvp(uuid, public.rsvp_role, text), public.cancel_rsvp(uuid),
  public.decide_request(uuid, boolean), public.open_invite(text),
  public.send_member_invite(), public.redeem_member_invite(text),
  public.host_requests(uuid), public.session_people(uuid), public.get_address(uuid),
  public.create_jam(text, timestamptz, int, text, double precision, double precision, text, text, text,
                    text, public.jam_visibility, boolean, int, int, boolean, text, text, smallint[], smallint[])
  from public, anon;

grant execute on function
  public.rsvp(uuid, public.rsvp_role, text), public.cancel_rsvp(uuid),
  public.decide_request(uuid, boolean), public.open_invite(text),
  public.send_member_invite(), public.redeem_member_invite(text),
  public.host_requests(uuid), public.session_people(uuid), public.get_address(uuid),
  public.create_jam(text, timestamptz, int, text, double precision, double precision, text, text, text,
                    text, public.jam_visibility, boolean, int, int, boolean, text, text, smallint[], smallint[])
  to authenticated;

revoke execute on function public.touch_updated_at() from public, anon, authenticated;
