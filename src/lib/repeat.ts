// Repeat rules in the calendar standard (RFC 5545), limited to what the database understands:
// FREQ=DAILY|WEEKLY|MONTHLY, INTERVAL, BYDAY (with 1TU / -1FR for monthly), COUNT, UNTIL.

export const WEEKDAYS = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'] as const;
export type Weekday = (typeof WEEKDAYS)[number];

const DAY_NAMES: Record<Weekday, string> = {
  MO: 'Monday', TU: 'Tuesday', WE: 'Wednesday', TH: 'Thursday',
  FR: 'Friday', SA: 'Saturday', SU: 'Sunday',
};
const ORDINALS: Record<number, string> = { 1: '1st', 2: '2nd', 3: '3rd', 4: '4th', [-1]: 'last' };

export type Ends =
  | { kind: 'never' }
  | { kind: 'on'; date: string } // YYYY-MM-DD, inclusive
  | { kind: 'after'; count: number };

export type Repeat =
  | { freq: 'once' }
  | { freq: 'daily'; interval: number; ends: Ends }
  | { freq: 'weekly'; interval: number; days: Weekday[]; ends: Ends }
  | { freq: 'monthly'; interval: number; week: 1 | 2 | 3 | 4 | -1; day: Weekday; ends: Ends };

/** Weekday code for a JS date (in the jam's own wall-clock date). */
export function weekdayOf(date: Date): Weekday {
  return WEEKDAYS[(date.getDay() + 6) % 7];
}

/** Which week of the month a date falls in: 1..4, or -1 for the last one. */
export function weekOfMonth(date: Date): 1 | 2 | 3 | 4 | -1 {
  const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  if (date.getDate() + 7 > daysInMonth) return -1;
  return Math.ceil(date.getDate() / 7) as 1 | 2 | 3 | 4;
}

export function buildRule(repeat: Repeat): string | null {
  if (repeat.freq === 'once') return null;
  const parts = [`FREQ=${repeat.freq.toUpperCase()}`];
  if (repeat.interval > 1) parts.push(`INTERVAL=${repeat.interval}`);
  if (repeat.freq === 'weekly') parts.push(`BYDAY=${sortDays(repeat.days).join(',')}`);
  if (repeat.freq === 'monthly') parts.push(`BYDAY=${repeat.week}${repeat.day}`);
  if (repeat.ends.kind === 'on') parts.push(`UNTIL=${repeat.ends.date.replaceAll('-', '')}`);
  if (repeat.ends.kind === 'after') parts.push(`COUNT=${repeat.ends.count}`);
  return parts.join(';');
}

export function parseRule(rule: string | null | undefined): Repeat {
  if (!rule) return { freq: 'once' };
  const map = new Map(
    rule.toUpperCase().split(';').map((p) => p.split('=') as [string, string]),
  );
  const interval = Math.max(1, Number(map.get('INTERVAL') ?? 1) || 1);
  const until = map.get('UNTIL');
  const count = map.get('COUNT');
  const ends: Ends = until
    ? { kind: 'on', date: `${until.slice(0, 4)}-${until.slice(4, 6)}-${until.slice(6, 8)}` }
    : count
      ? { kind: 'after', count: Number(count) }
      : { kind: 'never' };
  const byday = (map.get('BYDAY') ?? '').split(',').filter(Boolean);

  switch (map.get('FREQ')) {
    case 'DAILY':
      return { freq: 'daily', interval, ends };
    case 'WEEKLY':
      return { freq: 'weekly', interval, days: byday.filter(isWeekday), ends };
    case 'MONTHLY': {
      const m = /^(-?\d)?([A-Z]{2})$/.exec(byday[0] ?? '');
      if (!m || !isWeekday(m[2])) return { freq: 'once' };
      const week = Number(m[1] ?? 1);
      return {
        freq: 'monthly',
        interval,
        week: ([1, 2, 3, 4, -1].includes(week) ? week : 1) as 1 | 2 | 3 | 4 | -1,
        day: m[2],
        ends,
      };
    }
    default:
      return { freq: 'once' };
  }
}

/** Plain-words summary, e.g. "Every Thursday" or "2nd Tuesday of every month". */
export function describeRepeat(repeat: Repeat): string {
  const every = (n: number, unit: string) =>
    n === 1 ? `Every ${unit}` : n === 2 ? `Every other ${unit}` : `Every ${n} ${unit}s`;

  let text: string;
  switch (repeat.freq) {
    case 'once':
      return 'Happens once';
    case 'daily':
      text = every(repeat.interval, 'day');
      break;
    case 'weekly': {
      const days = sortDays(repeat.days).map((d) => DAY_NAMES[d]);
      const list = days.length <= 1 ? days.join('') : `${days.slice(0, -1).join(', ')} and ${days.at(-1)}`;
      text = repeat.interval === 1 ? `Every ${list}` : `${every(repeat.interval, 'week')} on ${list}`;
      break;
    }
    case 'monthly': {
      const which = `${ORDINALS[repeat.week]} ${DAY_NAMES[repeat.day]}`;
      text = repeat.interval === 1
        ? `${capitalize(which)} of every month`
        : `${capitalize(which)}, ${every(repeat.interval, 'month').toLowerCase()}`;
      break;
    }
  }
  if (repeat.ends.kind === 'on') text += `, until ${repeat.ends.date}`;
  if (repeat.ends.kind === 'after') text += `, ${repeat.ends.count} times`;
  return text;
}

function isWeekday(v: string): v is Weekday {
  return (WEEKDAYS as readonly string[]).includes(v);
}

function sortDays(days: Weekday[]): Weekday[] {
  return [...new Set(days)].sort((a, b) => WEEKDAYS.indexOf(a) - WEEKDAYS.indexOf(b));
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
