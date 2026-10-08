import "server-only";
import { fuzzyCenter, type LatLng } from "./geo";
import { addLocalDays, atLocalTime, localParts } from "./time";
import type { Jam, Message, Rsvp, RsvpStatus, User } from "./types";

/**
 * In-memory data for the prototype. Everything resets when the server
 * restarts. The functions below are the only way the app touches data, so
 * swapping this file for a real database (Supabase in the plan) leaves the
 * pages alone.
 */
type Db = { users: User[]; jams: Jam[]; rsvps: Rsvp[]; messages: Message[] };

const globalForDb = globalThis as unknown as { jamboreeDb?: Db };

function db(): Db {
  globalForDb.jamboreeDb ??= seed(Date.now());
  return globalForDb.jamboreeDb;
}

export function getUsers(): User[] {
  return db().users;
}

export function getUser(id: string | undefined | null): User | null {
  if (!id) return null;
  return db().users.find((u) => u.id === id) ?? null;
}

export function listJams(): Jam[] {
  return db().jams;
}

export function getJam(id: string): Jam | null {
  return db().jams.find((j) => j.id === id) ?? null;
}

export function createJam(input: Omit<Jam, "id" | "fuzzyLocation" | "createdAt">): Jam {
  const jam: Jam = { ...input, id: crypto.randomUUID(), fuzzyLocation: fuzzyCenter(input.location), createdAt: Date.now() };
  db().jams.push(jam);
  return jam;
}

export function getRsvps(jamId: string): Rsvp[] {
  return db().rsvps.filter((r) => r.jamId === jamId);
}

export function getRsvp(jamId: string, userId: string): Rsvp | null {
  return db().rsvps.find((r) => r.jamId === jamId && r.userId === userId) ?? null;
}

export function setRsvp(jamId: string, userId: string, status: RsvpStatus, note = ""): void {
  const existing = getRsvp(jamId, userId);
  if (existing) {
    existing.status = status;
    if (note) existing.note = note;
    existing.at = Date.now();
  } else {
    db().rsvps.push({ jamId, userId, status, note, at: Date.now() });
  }
}

export function removeRsvp(jamId: string, userId: string): void {
  const d = db();
  d.rsvps = d.rsvps.filter((r) => !(r.jamId === jamId && r.userId === userId));
}

export function listMessages(jamId: string): Message[] {
  return db().messages.filter((m) => m.jamId === jamId);
}

export function addMessage(jamId: string, userId: string, text: string): void {
  db().messages.push({ id: crypto.randomUUID(), jamId, userId, text, at: Date.now() });
}

// ---- Demo data -------------------------------------------------------------
// Fictional jams in real Seattle neighborhoods, so the map has something on it.
// Real listings come from the community seed list.

const PLACES: Record<string, LatLng> = {
  capitolHill: { lat: 47.6205, lng: -122.3212 },
  ballard: { lat: 47.6687, lng: -122.3847 },
  fremont: { lat: 47.651, lng: -122.35 },
  georgetown: { lat: 47.548, lng: -122.322 },
  columbiaCity: { lat: 47.559, lng: -122.286 },
  gasWorks: { lat: 47.6456, lng: -122.3344 },
  greenwood: { lat: 47.69, lng: -122.355 },
  beaconHill: { lat: 47.57, lng: -122.31 },
};

/** The next local day (from today on) that falls on `weekday`, at `time`. */
function next(now: number, weekday: number, time: string): number {
  for (let i = 0; i < 7; i++) {
    const day = addLocalDays(now, i);
    if (localParts(day + 12 * 3600_000).weekday === weekday) return atLocalTime(day, time);
  }
  throw new Error("unreachable");
}

function seed(now: number): Db {
  const users: User[] = [
    { id: "u_ana", name: "Ana", instruments: ["bass"], invitedBy: null, founder: true },
    { id: "u_lee", name: "Lee", instruments: ["tenor sax", "flute"], invitedBy: null, founder: true },
    { id: "u_mo", name: "Mo", instruments: ["drums"], invitedBy: "u_ana" },
    { id: "u_kit", name: "Kit", instruments: ["modular synth", "contact mics"], invitedBy: "u_mo" },
    { id: "u_jules", name: "Jules", instruments: ["guitar", "vocals"], invitedBy: null },
  ];

  const base = { durationMins: 180, capacity: null, createdAt: now };
  const jam = (j: Omit<Jam, "fuzzyLocation" | "durationMins" | "capacity" | "createdAt"> & Partial<Jam>): Jam => ({
    ...base,
    fuzzyLocation: fuzzyCenter(j.location),
    ...j,
  });

  const jams: Jam[] = [
    jam({
      id: "tuesday-jazz",
      title: "Tuesday Night Jazz Jam",
      hostId: "u_lee",
      genres: ["jazz"],
      description: "House trio plays a set at 9, then the sign-up list opens. Bring a standard or two; Real Book tunes are safe.",
      instrumentsWanted: ["horns", "vocals"],
      provided: ["drums", "piano", "bass amp", "PA"],
      vibe: "All levels",
      openness: "public",
      placeName: "The Blue Lantern (demo venue)",
      address: "Pike St & 11th Ave, Seattle",
      location: PLACES.capitolHill,
      schedule: { kind: "weekly", weekday: 2, time: "21:00" },
    }),
    jam({
      id: "blues-anchor",
      title: "Wednesday Blues & Rock Jam",
      hostId: "u_ana",
      genres: ["blues", "rock"],
      description: "Shuffles, 12-bars and the occasional Zeppelin tune. Sign up at the bar.",
      instrumentsWanted: ["guitar", "harmonica", "drums"],
      provided: ["backline", "PA"],
      vibe: "All levels",
      openness: "public",
      placeName: "The Rusty Anchor (demo venue)",
      address: "NW Market St, Ballard",
      location: PLACES.ballard,
      schedule: { kind: "weekly", weekday: 3, time: "20:00" },
    }),
    jam({
      id: "garage-funk",
      title: "Garage funk session",
      hostId: "u_mo",
      genres: ["funk", "soul"],
      description: "Long grooves, no charts. Small garage, so I keep it to about 8 people.",
      instrumentsWanted: ["bass", "keys"],
      provided: ["drums", "guitar amp", "bass amp"],
      vibe: "Experienced",
      openness: "approval",
      placeName: "A garage in Georgetown",
      address: "123 Demo Ave S, Seattle (demo address)",
      location: PLACES.georgetown,
      schedule: { kind: "once", start: next(now, 6, "16:00") },
      capacity: 8,
    }),
    jam({
      id: "noise-circle",
      title: "Noise & drone circle",
      hostId: "u_kit",
      genres: ["experimental", "noise"],
      description: "Bring anything that makes a sound: pedals, tapes, bowed cymbals, voice. We usually play one long piece.",
      instrumentsWanted: ["anything"],
      provided: ["PA", "a few synths", "extension cords"],
      vibe: "All levels",
      openness: "approval",
      placeName: "A basement on Beacon Hill",
      address: "456 Demo St, Seattle (demo address)",
      location: PLACES.beaconHill,
      schedule: { kind: "weekly", weekday: 4, time: "20:00" },
    }),
    jam({
      id: "park-bluegrass",
      title: "Bluegrass picking at Gas Works",
      hostId: "u_lee",
      genres: ["bluegrass", "folk"],
      description: "Pickin' circle on the hill, weather permitting. Acoustic only.",
      instrumentsWanted: ["banjo", "fiddle", "mandolin"],
      provided: [],
      vibe: "Listeners welcome",
      openness: "public",
      placeName: "Gas Works Park, north hill",
      address: "Gas Works Park, Seattle",
      location: PLACES.gasWorks,
      schedule: { kind: "once", start: next(now, 0, "14:00") },
    }),
    jam({
      id: "backyard-rock",
      title: "Backyard rock jam",
      hostId: "u_ana",
      genres: ["rock", "indie"],
      description: "Covers and whatever we make up. Neighbors are cool until 10.",
      instrumentsWanted: ["drums", "vocals", "guitar"],
      provided: ["guitar amp", "bass amp", "PA"],
      vibe: "All levels",
      openness: "rsvp",
      placeName: "A backyard in Greenwood",
      address: "789 Demo Pl N, Seattle (demo address)",
      location: PLACES.greenwood,
      schedule: { kind: "once", start: next(now, 5, "19:00") },
      capacity: 15,
    }),
    jam({
      id: "irish-session",
      title: "Monday Irish session",
      hostId: "u_lee",
      genres: ["irish", "folk"],
      description: "Trad session in the back corner. Slow tunes for the first hour.",
      instrumentsWanted: ["fiddle", "whistle", "bodhrán"],
      provided: [],
      vibe: "All levels",
      openness: "public",
      placeName: "The Crooked Fiddle (demo venue)",
      address: "Fremont Ave N, Seattle",
      location: PLACES.fremont,
      schedule: { kind: "weekly", weekday: 1, time: "19:30" },
    }),
    jam({
      id: "descarga",
      title: "Sunday Latin jazz descarga",
      hostId: "u_mo",
      genres: ["latin", "jazz"],
      description: "Montunos and mambos. Percussionists very welcome.",
      instrumentsWanted: ["congas", "trumpet", "piano"],
      provided: ["piano", "timbales", "PA"],
      vibe: "Listeners welcome",
      openness: "public",
      placeName: "Casa Clave (demo venue)",
      address: "Rainier Ave S, Columbia City",
      location: PLACES.columbiaCity,
      schedule: { kind: "weekly", weekday: 0, time: "18:00" },
    }),
  ];

  const rsvps: Rsvp[] = [
    { jamId: "garage-funk", userId: "u_ana", status: "approved", note: "", at: now },
    { jamId: "garage-funk", userId: "u_jules", status: "requested", note: "Rhythm guitar, I can hold a groove.", at: now },
    { jamId: "noise-circle", userId: "u_mo", status: "approved", note: "", at: now },
    { jamId: "tuesday-jazz", userId: "u_ana", status: "going", note: "", at: now },
    { jamId: "backyard-rock", userId: "u_mo", status: "going", note: "", at: now },
  ];

  const messages: Message[] = [
    { id: "m1", jamId: "garage-funk", userId: "u_mo", text: "Street parking is easy. Come in through the side gate.", at: now },
    { id: "m2", jamId: "garage-funk", userId: "u_ana", text: "Bringing my 5-string!", at: now },
  ];

  return { users, jams, rsvps, messages };
}
