import { describe, expect, it } from "vitest";
import { addLocalDays, formatTime, localParts, localToUtc } from "../time";
import type { Jam } from "../types";
import { occurrences } from "../views";

const weekly = (weekday: number, time: string): Jam => ({
  id: "w",
  title: "Weekly",
  hostId: "h",
  genres: [],
  description: "",
  instrumentsWanted: [],
  provided: [],
  vibe: "",
  openness: "public",
  placeName: "",
  address: "",
  location: { lat: 0, lng: 0 },
  fuzzyLocation: { lat: 0, lng: 0 },
  schedule: { kind: "weekly", weekday, time },
  durationMins: 180,
  capacity: null,
  createdAt: 0,
});

describe("Seattle time", () => {
  it("converts wall-clock times across daylight saving", () => {
    expect(new Date(localToUtc(2026, 7, 1, 21, 0)).toISOString()).toBe("2026-07-02T04:00:00.000Z"); // PDT
    expect(new Date(localToUtc(2026, 12, 1, 21, 0)).toISOString()).toBe("2026-12-02T05:00:00.000Z"); // PST
  });

  it("steps over the November DST change by calendar day", () => {
    const sat = localToUtc(2026, 10, 31, 0, 0);
    expect(localParts(addLocalDays(sat, 2))).toMatchObject({ month: 11, day: 2, hour: 0 });
  });
});

describe("weekly occurrences", () => {
  const thursdayNoon = localToUtc(2026, 10, 8, 12, 0);

  it("lists a Tuesday 9pm jam once in the next 7 days, at 9pm local", () => {
    const starts = occurrences(weekly(2, "21:00"), thursdayNoon, addLocalDays(thursdayNoon, 7));
    expect(starts).toHaveLength(1);
    expect(localParts(starts[0])).toMatchObject({ weekday: 2, month: 10, day: 13, hour: 21 });
    expect(formatTime(starts[0])).toBe("9:00 PM");
  });

  it("keeps tonight's jam listed while it's still going", () => {
    const thursday9pm = localToUtc(2026, 10, 8, 21, 0);
    const at10pm = localToUtc(2026, 10, 8, 22, 0);
    expect(occurrences(weekly(4, "21:00"), at10pm, addLocalDays(at10pm, 1))).toEqual([thursday9pm]);
  });
});
