// Jams are scheduled in local Seattle time, whatever timezone the server runs in.
export const TIME_ZONE = "America/Los_Angeles";

const DAY_MS = 24 * 60 * 60 * 1000;

type Parts = { year: number; month: number; day: number; hour: number; minute: number; weekday: number };

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const partsFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "numeric",
  day: "numeric",
  hour: "numeric",
  minute: "numeric",
  weekday: "short",
  hourCycle: "h23",
});

/** Calendar parts of an instant, as seen on a Seattle wall clock. */
export function localParts(t: number): Parts {
  const p: Record<string, string> = {};
  for (const { type, value } of partsFormatter.formatToParts(new Date(t))) p[type] = value;
  return {
    year: Number(p.year),
    month: Number(p.month),
    day: Number(p.day),
    hour: Number(p.hour),
    minute: Number(p.minute),
    weekday: WEEKDAYS.indexOf(p.weekday),
  };
}

/** The instant at which a Seattle wall clock reads the given date and time. */
export function localToUtc(year: number, month: number, day: number, hour: number, minute: number): number {
  const asIfUtc = Date.UTC(year, month - 1, day, hour, minute);
  // Correct by the zone offset at that moment; a second pass settles DST edges.
  let t = asIfUtc;
  for (let i = 0; i < 2; i++) {
    const p = localParts(t);
    const shown = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute);
    t += asIfUtc - shown;
  }
  return t;
}

/** Midnight (Seattle time) at the start of the day containing t. */
export function startOfLocalDay(t: number): number {
  const p = localParts(t);
  return localToUtc(p.year, p.month, p.day, 0, 0);
}

/** Midnight (Seattle time) n days after the local day containing t. */
export function addLocalDays(t: number, n: number): number {
  const p = localParts(startOfLocalDay(t) + n * DAY_MS + 12 * 60 * 60 * 1000);
  return localToUtc(p.year, p.month, p.day, 0, 0);
}

/** "HH:MM" on the local day that starts at dayStart. */
export function atLocalTime(dayStart: number, hhmm: string): number {
  const [hour, minute] = hhmm.split(":").map(Number);
  const p = localParts(dayStart);
  return localToUtc(p.year, p.month, p.day, hour, minute);
}

/** A stable key for a local calendar day, e.g. "2026-10-08". */
export function dayKey(t: number): string {
  const p = localParts(t);
  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
}

export function formatDay(t: number, now: number): string {
  const key = dayKey(t);
  if (key === dayKey(now)) return "Tonight";
  if (key === dayKey(addLocalDays(now, 1))) return "Tomorrow";
  return new Intl.DateTimeFormat("en-US", { timeZone: TIME_ZONE, weekday: "long", month: "short", day: "numeric" }).format(t);
}

export function formatTime(t: number): string {
  return new Intl.DateTimeFormat("en-US", { timeZone: TIME_ZONE, hour: "numeric", minute: "2-digit" }).format(t);
}

export const WEEKDAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
