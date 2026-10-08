import type { LatLng } from "./geo";

export type User = {
  id: string;
  name: string;
  instruments: string[];
  /** Who invited this person to post. Posting needs an invite during the beta. */
  invitedBy: string | null;
  /** Founding members can post without an invite. */
  founder?: boolean;
};

/**
 * public:   exact pin and address for everyone.
 * rsvp:     fuzzy circle; the address unlocks when you RSVP.
 * approval: fuzzy circle; the address unlocks when the host approves you.
 */
export type Openness = "public" | "rsvp" | "approval";

export type Schedule =
  | { kind: "once"; start: number }
  | { kind: "weekly"; weekday: number; time: string };

export type Jam = {
  id: string;
  title: string;
  hostId: string;
  genres: string[];
  description: string;
  instrumentsWanted: string[];
  provided: string[];
  vibe: string;
  openness: Openness;
  /** Shown to everyone: a venue name, or a vague place like "Backyard in Ballard". */
  placeName: string;
  /** Private for rsvp/approval jams until the viewer is let in. */
  address: string;
  location: LatLng;
  /** Center of the one-mile circle shown instead of the real location. */
  fuzzyLocation: LatLng;
  schedule: Schedule;
  durationMins: number;
  capacity: number | null;
  createdAt: number;
};

export type RsvpStatus = "going" | "requested" | "approved" | "declined";

export type Rsvp = {
  jamId: string;
  userId: string;
  status: RsvpStatus;
  note: string;
  at: number;
};

export type Message = {
  id: string;
  jamId: string;
  userId: string;
  text: string;
  at: number;
};
