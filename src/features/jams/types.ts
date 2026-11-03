// Shapes the jam features pass around. Most come straight from the generated database types.
import type { Database, Enums } from '@/lib/database.types';

type Fns = Database['public']['Functions'];
export type JamListing = Fns['browse_jams']['Returns'][number];
export type Person = Fns['session_people']['Returns'][number];
export type Address = Fns['get_address']['Returns'][number];
export type NewJam = Fns['create_jam']['Args'];
export type RsvpRole = Enums<'rsvp_role'>;
export type RsvpStatus = Enums<'rsvp_status'>;
export type Visibility = Enums<'jam_visibility'>;
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

export type Place = { label: string; address: string; neighborhood: string | null; lat: number; lng: number };
