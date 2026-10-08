import { FUZZY_RADIUS_M } from "./geo";
import { addLocalDays, atLocalTime, localParts } from "./time";
import type { Jam, Openness, Rsvp, User } from "./types";

/**
 * Where a jam is, as one viewer is allowed to see it. Pages only ever receive
 * this, never the raw Jam, so a private address can't leak into the HTML or
 * the map data.
 */
export type JamLocationView =
  | { kind: "exact"; lat: number; lng: number; address: string }
  | { kind: "area"; lat: number; lng: number; radiusM: number };

export type JamView = Omit<Jam, "address" | "location" | "fuzzyLocation"> & {
  where: JamLocationView;
  /** Next start time within the window asked for, if any. */
  nextStart: number | null;
};

/** Start times of a jam between `from` (inclusive) and `to` (exclusive). */
export function occurrences(jam: Jam, from: number, to: number): number[] {
  const s = jam.schedule;
  if (s.kind === "once") return s.start + jam.durationMins * 60_000 > from && s.start < to ? [s.start] : [];
  const starts: number[] = [];
  for (let day = addLocalDays(from, 0); day < to; day = addLocalDays(day, 1)) {
    if (localParts(day + 12 * 3600_000).weekday !== s.weekday) continue;
    const start = atLocalTime(day, s.time);
    // Include a jam that has started but not yet ended.
    if (start + jam.durationMins * 60_000 > from && start < to) starts.push(start);
  }
  return starts;
}

/** A one-off jam is over once its end time has passed; a weekly one never is. */
export function isOver(jam: Jam, now: number): boolean {
  return jam.schedule.kind === "once" && jam.schedule.start + jam.durationMins * 60_000 < now;
}

export function canSeeAddress(jam: Jam, viewerId: string | null, rsvp: Rsvp | null, now: number): boolean {
  if (jam.openness === "public") return true;
  if (!viewerId) return false;
  if (viewerId === jam.hostId) return true;
  // Guests lose the address once the jam is over.
  if (isOver(jam, now)) return false;
  if (!rsvp || rsvp.userId !== viewerId || rsvp.jamId !== jam.id) return false;
  if (jam.openness === "rsvp") return rsvp.status === "going" || rsvp.status === "approved";
  return rsvp.status === "approved";
}

export function toJamView(jam: Jam, viewerId: string | null, rsvp: Rsvp | null, now: number, windowDays = 7): JamView {
  // Pull out the private fields so they can't ride along in the spread below.
  const { address, location, fuzzyLocation, ...rest } = jam;
  const where: JamLocationView = canSeeAddress(jam, viewerId, rsvp, now)
    ? { kind: "exact", lat: location.lat, lng: location.lng, address }
    : { kind: "area", lat: fuzzyLocation.lat, lng: fuzzyLocation.lng, radiusM: FUZZY_RADIUS_M };
  const [nextStart = null] = occurrences(jam, now, addLocalDays(now, windowDays));
  return { ...rest, where, nextStart };
}

/** During the beta, posting needs an invite from a member. */
export function canPost(user: User | null): boolean {
  return !!user && (!!user.founder || !!user.invitedBy);
}

export const OPENNESS_LABEL: Record<Openness, string> = {
  public: "Public",
  rsvp: "RSVP to see address",
  approval: "Approval needed",
};

export const OPENNESS_HINT: Record<Openness, string> = {
  public: "Exact location for everyone. Good for venues and parks.",
  rsvp: "Map shows a one-mile circle. The address unlocks when someone RSVPs.",
  approval: "Map shows a one-mile circle. Only guests you approve get the address.",
};
