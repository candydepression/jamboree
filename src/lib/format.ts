// Dates are always shown in the jam's own timezone, not the phone's.

function parts(iso: string, timeZone: string, options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat('en-US', { timeZone, ...options }).formatToParts(new Date(iso));
}

/** "7:30 PM" */
export function formatTime(iso: string, timeZone: string): string {
  // Some engines put a narrow no-break space before AM/PM; keep it a plain space everywhere.
  return new Intl.DateTimeFormat('en-US', { timeZone, hour: 'numeric', minute: '2-digit' })
    .format(new Date(iso))
    .replace(/\s/g, ' ');
}

/** "Thu, Nov 6" */
export function formatDay(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'short', month: 'short', day: 'numeric' })
    .format(new Date(iso));
}

/** "THU · NOV 6 · 7:30 PM", for the mono labels. */
export function formatStamp(iso: string, timeZone: string): string {
  return `${formatDay(iso, timeZone).replace(',', ' ·')} · ${formatTime(iso, timeZone)}`.toUpperCase();
}

/** The little date block on list cards: weekday on top, time below ("7:30", or "8 PM" on the hour). */
export function dateBlock(iso: string, timeZone: string): { top: string; main: string } {
  const top = new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'short' }).format(new Date(iso)).toUpperCase();
  const [clock, period] = formatTime(iso, timeZone).split(' ');
  return { top, main: clock.endsWith(':00') ? `${clock.slice(0, -3)} ${period}` : clock };
}

/** YYYY-MM-DD of an instant, in a timezone. */
export function localDate(iso: string | Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' })
    .format(typeof iso === 'string' ? new Date(iso) : iso);
}

/** The instant a wall-clock date and time in a timezone happens, e.g. 2026-11-06 19:30 in Seattle. */
export function zonedInstant(date: string, time: string, timeZone: string): Date {
  const [y, m, d] = date.split('-').map(Number);
  const [hh, mm] = time.split(':').map(Number);
  const guess = Date.UTC(y, m - 1, d, hh, mm);
  // How far the timezone is from UTC at that moment (handles daylight saving).
  const offset = (instant: number) => {
    const p = Object.fromEntries(
      parts(new Date(instant).toISOString(), timeZone, {
        year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
      }).map((x) => [x.type, x.value]),
    );
    return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute) - instant;
  };
  const first = guess - offset(guess);
  return new Date(guess - offset(first));
}

export function spotsLabel(taken: number, cap: number | null, noun: string): string {
  return cap ? `${taken}/${cap} ${noun}` : `${taken} ${noun}`;
}
