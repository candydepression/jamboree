import { describe, expect, it } from "vitest";
import { FUZZY_RADIUS_M, distanceM, fuzzyCenter } from "../geo";
import { localToUtc } from "../time";
import type { Jam, Rsvp } from "../types";
import { canPost, canSeeAddress, toJamView } from "../views";

const NOW = localToUtc(2026, 10, 8, 12, 0); // Thu Oct 8 2026, noon in Seattle
const HOUSE = { lat: 47.548, lng: -122.322 };

function jam(overrides: Partial<Jam> = {}): Jam {
  return {
    id: "j1",
    title: "Garage jam",
    hostId: "host",
    genres: ["funk"],
    description: "",
    instrumentsWanted: [],
    provided: [],
    vibe: "All levels",
    openness: "approval",
    placeName: "A garage in Georgetown",
    address: "123 Secret St",
    location: HOUSE,
    fuzzyLocation: fuzzyCenter(HOUSE),
    schedule: { kind: "once", start: localToUtc(2026, 10, 10, 16, 0) },
    durationMins: 180,
    capacity: null,
    createdAt: NOW,
    ...overrides,
  };
}

const rsvp = (status: Rsvp["status"], userId = "guest"): Rsvp => ({ jamId: "j1", userId, status, note: "", at: NOW });

describe("fuzzy location", () => {
  it("keeps the real spot inside the circle but away from its center", () => {
    for (let i = 0; i < 500; i++) {
      const d = distanceM(HOUSE, fuzzyCenter(HOUSE));
      expect(d).toBeGreaterThanOrEqual(FUZZY_RADIUS_M * 0.2 - 1);
      expect(d).toBeLessThanOrEqual(FUZZY_RADIUS_M * 0.7 + 1);
    }
  });
});

describe("who sees the address", () => {
  it("shows public jams to everyone, signed in or not", () => {
    expect(canSeeAddress(jam({ openness: "public" }), null, null, NOW)).toBe(true);
  });

  it("hides approval jams until the host approves", () => {
    const j = jam();
    expect(canSeeAddress(j, null, null, NOW)).toBe(false);
    expect(canSeeAddress(j, "guest", null, NOW)).toBe(false);
    expect(canSeeAddress(j, "guest", rsvp("requested"), NOW)).toBe(false);
    expect(canSeeAddress(j, "guest", rsvp("declined"), NOW)).toBe(false);
    expect(canSeeAddress(j, "guest", rsvp("approved"), NOW)).toBe(true);
    expect(canSeeAddress(j, "host", null, NOW)).toBe(true);
  });

  it("unlocks rsvp jams on RSVP", () => {
    expect(canSeeAddress(jam({ openness: "rsvp" }), "guest", rsvp("going"), NOW)).toBe(true);
  });

  it("ignores someone else's RSVP", () => {
    expect(canSeeAddress(jam(), "guest", rsvp("approved", "other"), NOW)).toBe(false);
  });

  it("hides the address from guests after a one-off jam ends", () => {
    const after = localToUtc(2026, 10, 10, 20, 0);
    expect(canSeeAddress(jam(), "guest", rsvp("approved"), after)).toBe(false);
    expect(canSeeAddress(jam(), "host", null, after)).toBe(true);
  });

  it("never puts the address or real coordinates in a locked view", () => {
    const view = toJamView(jam(), "guest", rsvp("requested"), NOW);
    const json = JSON.stringify(view);
    expect(json).not.toContain("123 Secret St");
    expect(json).not.toContain(String(HOUSE.lat));
    expect(json).not.toContain(String(HOUSE.lng));
    expect(view.where).toMatchObject({ kind: "area", radiusM: FUZZY_RADIUS_M });
  });

  it("includes the address once let in", () => {
    const view = toJamView(jam(), "guest", rsvp("approved"), NOW);
    expect(view.where).toMatchObject({ kind: "exact", address: "123 Secret St", lat: HOUSE.lat });
  });
});

describe("posting during the beta", () => {
  it("needs an invite or founder status", () => {
    expect(canPost(null)).toBe(false);
    expect(canPost({ id: "a", name: "A", instruments: [], invitedBy: null })).toBe(false);
    expect(canPost({ id: "a", name: "A", instruments: [], invitedBy: "b" })).toBe(true);
    expect(canPost({ id: "a", name: "A", instruments: [], invitedBy: null, founder: true })).toBe(true);
  });
});
