export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      blocks: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "blocks_blocked_id_fkey"
            columns: ["blocked_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blocks_blocker_id_fkey"
            columns: ["blocker_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          author_id: string | null
          body: string
          created_at: string
          deleted_at: string | null
          id: string
          session_id: string
        }
        Insert: {
          author_id?: string | null
          body: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          session_id: string
        }
        Update: {
          author_id?: string | null
          body?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "jam_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback: {
        Row: {
          app_version: string | null
          created_at: string
          id: string
          message: string
          profile_id: string | null
          screen: string | null
          status: Database["public"]["Enums"]["feedback_status"]
          tags: string[]
        }
        Insert: {
          app_version?: string | null
          created_at?: string
          id?: string
          message: string
          profile_id?: string | null
          screen?: string | null
          status?: Database["public"]["Enums"]["feedback_status"]
          tags?: string[]
        }
        Update: {
          app_version?: string | null
          created_at?: string
          id?: string
          message?: string
          profile_id?: string | null
          screen?: string | null
          status?: Database["public"]["Enums"]["feedback_status"]
          tags?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "feedback_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      follows: {
        Row: {
          created_at: string
          followed_jam_id: string | null
          followed_profile_id: string | null
          follower_id: string
          id: string
        }
        Insert: {
          created_at?: string
          followed_jam_id?: string | null
          followed_profile_id?: string | null
          follower_id: string
          id?: string
        }
        Update: {
          created_at?: string
          followed_jam_id?: string | null
          followed_profile_id?: string | null
          follower_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "follows_followed_jam_id_fkey"
            columns: ["followed_jam_id"]
            isOneToOne: false
            referencedRelation: "jams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follows_followed_profile_id_fkey"
            columns: ["followed_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follows_follower_id_fkey"
            columns: ["follower_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      friendships: {
        Row: {
          created_at: string
          friend_id: string
          profile_id: string
        }
        Insert: {
          created_at?: string
          friend_id: string
          profile_id: string
        }
        Update: {
          created_at?: string
          friend_id?: string
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "friendships_friend_id_fkey"
            columns: ["friend_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "friendships_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      genres: {
        Row: {
          id: number
          name: string
        }
        Insert: {
          id?: never
          name: string
        }
        Update: {
          id?: never
          name?: string
        }
        Relationships: []
      }
      instruments: {
        Row: {
          id: number
          name: string
        }
        Insert: {
          id?: never
          name: string
        }
        Update: {
          id?: never
          name?: string
        }
        Relationships: []
      }
      jam_genres: {
        Row: {
          genre_id: number
          jam_id: string
        }
        Insert: {
          genre_id: number
          jam_id: string
        }
        Update: {
          genre_id?: number
          jam_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "jam_genres_genre_id_fkey"
            columns: ["genre_id"]
            isOneToOne: false
            referencedRelation: "genres"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jam_genres_jam_id_fkey"
            columns: ["jam_id"]
            isOneToOne: false
            referencedRelation: "jams"
            referencedColumns: ["id"]
          },
        ]
      }
      jam_instruments_wanted: {
        Row: {
          instrument_id: number
          jam_id: string
        }
        Insert: {
          instrument_id: number
          jam_id: string
        }
        Update: {
          instrument_id?: number
          jam_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "jam_instruments_wanted_instrument_id_fkey"
            columns: ["instrument_id"]
            isOneToOne: false
            referencedRelation: "instruments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jam_instruments_wanted_jam_id_fkey"
            columns: ["jam_id"]
            isOneToOne: false
            referencedRelation: "jams"
            referencedColumns: ["id"]
          },
        ]
      }
      jam_invite_access: {
        Row: {
          created_at: string
          invite_id: string | null
          jam_id: string
          profile_id: string
        }
        Insert: {
          created_at?: string
          invite_id?: string | null
          jam_id: string
          profile_id: string
        }
        Update: {
          created_at?: string
          invite_id?: string | null
          jam_id?: string
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "jam_invite_access_invite_id_fkey"
            columns: ["invite_id"]
            isOneToOne: false
            referencedRelation: "jam_invites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jam_invite_access_jam_id_fkey"
            columns: ["jam_id"]
            isOneToOne: false
            referencedRelation: "jams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jam_invite_access_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      jam_invites: {
        Row: {
          created_at: string
          created_by: string
          id: string
          invited_profile_id: string | null
          jam_id: string
          token: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          invited_profile_id?: string | null
          jam_id: string
          token?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          invited_profile_id?: string | null
          jam_id?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "jam_invites_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jam_invites_invited_profile_id_fkey"
            columns: ["invited_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jam_invites_jam_id_fkey"
            columns: ["jam_id"]
            isOneToOne: false
            referencedRelation: "jams"
            referencedColumns: ["id"]
          },
        ]
      }
      jam_locations: {
        Row: {
          address: string
          jam_id: string
          lat: number
          lng: number
          place_name: string | null
        }
        Insert: {
          address: string
          jam_id: string
          lat: number
          lng: number
          place_name?: string | null
        }
        Update: {
          address?: string
          jam_id?: string
          lat?: number
          lng?: number
          place_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "jam_locations_jam_id_fkey"
            columns: ["jam_id"]
            isOneToOne: true
            referencedRelation: "jams"
            referencedColumns: ["id"]
          },
        ]
      }
      jam_sessions: {
        Row: {
          created_at: string
          ends_at: string
          id: string
          jam_id: string
          original_starts_at: string
          override_note: string | null
          starts_at: string
          status: Database["public"]["Enums"]["session_status"]
        }
        Insert: {
          created_at?: string
          ends_at: string
          id?: string
          jam_id: string
          original_starts_at: string
          override_note?: string | null
          starts_at: string
          status?: Database["public"]["Enums"]["session_status"]
        }
        Update: {
          created_at?: string
          ends_at?: string
          id?: string
          jam_id?: string
          original_starts_at?: string
          override_note?: string | null
          starts_at?: string
          status?: Database["public"]["Enums"]["session_status"]
        }
        Relationships: [
          {
            foreignKeyName: "jam_sessions_jam_id_fkey"
            columns: ["jam_id"]
            isOneToOne: false
            referencedRelation: "jams"
            referencedColumns: ["id"]
          },
        ]
      }
      jams: {
        Row: {
          approval_required: boolean
          created_at: string
          description: string | null
          duration: string
          fuzzy_lat: number | null
          fuzzy_lng: number | null
          host_id: string
          id: string
          listener_cap: number | null
          listeners_allowed: boolean
          neighborhood: string | null
          player_cap: number | null
          reminder_offsets: number[]
          repeat_rule: string | null
          start_time: string
          status: Database["public"]["Enums"]["jam_status"]
          timezone: string
          title: string
          updated_at: string
          venue_id: string | null
          vibe: string | null
          visibility: Database["public"]["Enums"]["jam_visibility"]
        }
        Insert: {
          approval_required?: boolean
          created_at?: string
          description?: string | null
          duration?: string
          fuzzy_lat?: number | null
          fuzzy_lng?: number | null
          host_id: string
          id?: string
          listener_cap?: number | null
          listeners_allowed?: boolean
          neighborhood?: string | null
          player_cap?: number | null
          reminder_offsets?: number[]
          repeat_rule?: string | null
          start_time: string
          status?: Database["public"]["Enums"]["jam_status"]
          timezone?: string
          title: string
          updated_at?: string
          venue_id?: string | null
          vibe?: string | null
          visibility?: Database["public"]["Enums"]["jam_visibility"]
        }
        Update: {
          approval_required?: boolean
          created_at?: string
          description?: string | null
          duration?: string
          fuzzy_lat?: number | null
          fuzzy_lng?: number | null
          host_id?: string
          id?: string
          listener_cap?: number | null
          listeners_allowed?: boolean
          neighborhood?: string | null
          player_cap?: number | null
          reminder_offsets?: number[]
          repeat_rule?: string | null
          start_time?: string
          status?: Database["public"]["Enums"]["jam_status"]
          timezone?: string
          title?: string
          updated_at?: string
          venue_id?: string | null
          vibe?: string | null
          visibility?: Database["public"]["Enums"]["jam_visibility"]
        }
        Relationships: [
          {
            foreignKeyName: "jams_host_id_fkey"
            columns: ["host_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jams_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      member_invites: {
        Row: {
          code: string
          created_at: string
          id: string
          inviter_id: string
          redeemed_at: string | null
          redeemed_by: string | null
        }
        Insert: {
          code?: string
          created_at?: string
          id?: string
          inviter_id: string
          redeemed_at?: string | null
          redeemed_by?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          inviter_id?: string
          redeemed_at?: string | null
          redeemed_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "member_invites_inviter_id_fkey"
            columns: ["inviter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_invites_redeemed_by_fkey"
            columns: ["redeemed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_prefs: {
        Row: {
          email_on: boolean
          profile_id: string
          push_on: boolean
          type: string
        }
        Insert: {
          email_on?: boolean
          profile_id: string
          push_on?: boolean
          type: string
        }
        Update: {
          email_on?: boolean
          profile_id?: string
          push_on?: boolean
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_prefs_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          email_sent_at: string | null
          id: string
          payload: Json
          profile_id: string
          push_sent_at: string | null
          read_at: string | null
          type: string
        }
        Insert: {
          created_at?: string
          email_sent_at?: string | null
          id?: string
          payload?: Json
          profile_id: string
          push_sent_at?: string | null
          read_at?: string | null
          type: string
        }
        Update: {
          created_at?: string
          email_sent_at?: string | null
          id?: string
          payload?: Json
          profile_id?: string
          push_sent_at?: string | null
          read_at?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_genres: {
        Row: {
          genre_id: number
          profile_id: string
        }
        Insert: {
          genre_id: number
          profile_id: string
        }
        Update: {
          genre_id?: number
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_genres_genre_id_fkey"
            columns: ["genre_id"]
            isOneToOne: false
            referencedRelation: "genres"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_genres_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_instruments: {
        Row: {
          instrument_id: number
          profile_id: string
        }
        Insert: {
          instrument_id: number
          profile_id: string
        }
        Update: {
          instrument_id?: number
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_instruments_instrument_id_fkey"
            columns: ["instrument_id"]
            isOneToOne: false
            referencedRelation: "instruments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_instruments_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          bio: string | null
          can_post: boolean
          created_at: string
          display_name: string | null
          experience_level:
            | Database["public"]["Enums"]["experience_level"]
            | null
          first_name: string
          id: string
          invited_by: string | null
          is_admin: boolean
          last_initial: string | null
          links: Json
          photo_path: string | null
          stage_name: string | null
          updated_at: string
        }
        Insert: {
          bio?: string | null
          can_post?: boolean
          created_at?: string
          display_name?: string | null
          experience_level?:
            | Database["public"]["Enums"]["experience_level"]
            | null
          first_name?: string
          id: string
          invited_by?: string | null
          is_admin?: boolean
          last_initial?: string | null
          links?: Json
          photo_path?: string | null
          stage_name?: string | null
          updated_at?: string
        }
        Update: {
          bio?: string | null
          can_post?: boolean
          created_at?: string
          display_name?: string | null
          experience_level?:
            | Database["public"]["Enums"]["experience_level"]
            | null
          first_name?: string
          id?: string
          invited_by?: string | null
          is_admin?: boolean
          last_initial?: string | null
          links?: Json
          photo_path?: string | null
          stage_name?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          created_at: string
          endpoint: string
          id: string
          keys: Json | null
          kind: Database["public"]["Enums"]["push_kind"]
          profile_id: string
        }
        Insert: {
          created_at?: string
          endpoint: string
          id?: string
          keys?: Json | null
          kind: Database["public"]["Enums"]["push_kind"]
          profile_id: string
        }
        Update: {
          created_at?: string
          endpoint?: string
          id?: string
          keys?: Json | null
          kind?: Database["public"]["Enums"]["push_kind"]
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reminder_log: {
        Row: {
          offset_minutes: number
          profile_id: string
          sent_at: string
          session_id: string
        }
        Insert: {
          offset_minutes: number
          profile_id: string
          sent_at?: string
          session_id: string
        }
        Update: {
          offset_minutes?: number
          profile_id?: string
          sent_at?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reminder_log_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reminder_log_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "jam_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          created_at: string
          id: string
          note: string | null
          reason: string
          reporter_id: string | null
          status: Database["public"]["Enums"]["report_status"]
          target_id: string
          target_type: Database["public"]["Enums"]["report_target"]
        }
        Insert: {
          created_at?: string
          id?: string
          note?: string | null
          reason: string
          reporter_id?: string | null
          status?: Database["public"]["Enums"]["report_status"]
          target_id: string
          target_type: Database["public"]["Enums"]["report_target"]
        }
        Update: {
          created_at?: string
          id?: string
          note?: string | null
          reason?: string
          reporter_id?: string | null
          status?: Database["public"]["Enums"]["report_status"]
          target_id?: string
          target_type?: Database["public"]["Enums"]["report_target"]
        }
        Relationships: [
          {
            foreignKeyName: "reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      rsvps: {
        Row: {
          created_at: string
          decided_at: string | null
          id: string
          note: string | null
          profile_id: string
          role: Database["public"]["Enums"]["rsvp_role"]
          session_id: string
          status: Database["public"]["Enums"]["rsvp_status"]
        }
        Insert: {
          created_at?: string
          decided_at?: string | null
          id?: string
          note?: string | null
          profile_id: string
          role?: Database["public"]["Enums"]["rsvp_role"]
          session_id: string
          status: Database["public"]["Enums"]["rsvp_status"]
        }
        Update: {
          created_at?: string
          decided_at?: string | null
          id?: string
          note?: string | null
          profile_id?: string
          role?: Database["public"]["Enums"]["rsvp_role"]
          session_id?: string
          status?: Database["public"]["Enums"]["rsvp_status"]
        }
        Relationships: [
          {
            foreignKeyName: "rsvps_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rsvps_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "jam_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      venue_claims: {
        Row: {
          claimant_id: string
          created_at: string
          id: string
          proof_note: string | null
          proof_url: string | null
          reviewed_at: string | null
          status: Database["public"]["Enums"]["claim_status"]
          venue_id: string
        }
        Insert: {
          claimant_id: string
          created_at?: string
          id?: string
          proof_note?: string | null
          proof_url?: string | null
          reviewed_at?: string | null
          status?: Database["public"]["Enums"]["claim_status"]
          venue_id: string
        }
        Update: {
          claimant_id?: string
          created_at?: string
          id?: string
          proof_note?: string | null
          proof_url?: string | null
          reviewed_at?: string | null
          status?: Database["public"]["Enums"]["claim_status"]
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "venue_claims_claimant_id_fkey"
            columns: ["claimant_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venue_claims_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      venues: {
        Row: {
          claimed_by: string | null
          created_at: string
          id: string
          instagram: string | null
          name: string
          neighborhood: string | null
          website: string | null
        }
        Insert: {
          claimed_by?: string | null
          created_at?: string
          id?: string
          instagram?: string | null
          name: string
          neighborhood?: string | null
          website?: string | null
        }
        Update: {
          claimed_by?: string | null
          created_at?: string
          id?: string
          instagram?: string | null
          name?: string
          neighborhood?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "venues_claimed_by_fkey"
            columns: ["claimed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      browse_jams: {
        Args: {
          p_east?: number
          p_from?: string
          p_mine?: boolean
          p_north?: number
          p_south?: number
          p_to?: string
          p_west?: number
        }
        Returns: {
          approval_required: boolean
          ends_at: string
          fuzzy_lat: number
          fuzzy_lng: number
          genres: string[]
          host_label: string
          is_host: boolean
          jam_id: string
          listener_cap: number
          listeners_allowed: boolean
          listeners_in: number
          my_role: Database["public"]["Enums"]["rsvp_role"]
          my_status: Database["public"]["Enums"]["rsvp_status"]
          neighborhood: string
          player_cap: number
          players_in: number
          repeats: boolean
          session_id: string
          starts_at: string
          timezone: string
          title: string
          venue_name: string
          visibility: Database["public"]["Enums"]["jam_visibility"]
          wanted: string[]
        }[]
      }
      cancel_rsvp: { Args: { p_session: string }; Returns: undefined }
      create_jam: {
        Args: {
          p_address: string
          p_approval_required?: boolean
          p_description?: string
          p_duration_minutes: number
          p_genre_ids?: number[]
          p_lat: number
          p_listener_cap?: number
          p_listeners_allowed?: boolean
          p_lng: number
          p_neighborhood?: string
          p_place_name?: string
          p_player_cap?: number
          p_repeat_rule?: string
          p_start_time: string
          p_timezone?: string
          p_title: string
          p_vibe?: string
          p_visibility?: Database["public"]["Enums"]["jam_visibility"]
          p_wanted_ids?: number[]
        }
        Returns: string
      }
      decide_request: {
        Args: { p_approve: boolean; p_rsvp: string }
        Returns: Database["public"]["Enums"]["rsvp_status"]
      }
      get_address: {
        Args: { p_session: string }
        Returns: {
          address: string
          lat: number
          lng: number
          place_name: string
        }[]
      }
      get_jam: { Args: { p_jam: string }; Returns: Json }
      host_requests: {
        Args: { p_session: string }
        Returns: {
          bio: string
          display_name: string
          experience_level: Database["public"]["Enums"]["experience_level"]
          instruments: string[]
          invited_by_name: string
          is_friend: boolean
          note: string
          people_you_both_know: number
          played_together: number
          profile_id: string
          requested_at: string
          role: Database["public"]["Enums"]["rsvp_role"]
          rsvp_id: string
        }[]
      }
      open_invite: { Args: { p_token: string }; Returns: string }
      redeem_member_invite: { Args: { p_code: string }; Returns: undefined }
      rsvp: {
        Args: {
          p_note?: string
          p_role?: Database["public"]["Enums"]["rsvp_role"]
          p_session: string
        }
        Returns: Database["public"]["Enums"]["rsvp_status"]
      }
      send_member_invite: { Args: never; Returns: string }
      session_people: {
        Args: { p_session: string }
        Returns: {
          display_name: string
          is_host: boolean
          profile_id: string
          role: Database["public"]["Enums"]["rsvp_role"]
          status: Database["public"]["Enums"]["rsvp_status"]
        }[]
      }
    }
    Enums: {
      claim_status: "pending" | "approved" | "rejected"
      experience_level: "just_starting" | "some_experience" | "seasoned" | "pro"
      feedback_status: "new" | "triaged" | "done"
      jam_status: "active" | "cancelled"
      jam_visibility: "public" | "invite_only"
      push_kind: "web" | "expo"
      report_status: "open" | "actioned" | "dismissed"
      report_target: "profile" | "jam" | "message"
      rsvp_role: "player" | "listener"
      rsvp_status: "confirmed" | "requested" | "declined" | "cancelled"
      session_status: "scheduled" | "skipped" | "cancelled" | "replaced"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      claim_status: ["pending", "approved", "rejected"],
      experience_level: ["just_starting", "some_experience", "seasoned", "pro"],
      feedback_status: ["new", "triaged", "done"],
      jam_status: ["active", "cancelled"],
      jam_visibility: ["public", "invite_only"],
      push_kind: ["web", "expo"],
      report_status: ["open", "actioned", "dismissed"],
      report_target: ["profile", "jam", "message"],
      rsvp_role: ["player", "listener"],
      rsvp_status: ["confirmed", "requested", "declined", "cancelled"],
      session_status: ["scheduled", "skipped", "cancelled", "replaced"],
    },
  },
} as const
