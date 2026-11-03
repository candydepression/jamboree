import { describe, expect, it } from 'vitest';

import { buildRule, describeRepeat, parseRule, weekOfMonth, weekdayOf, type Repeat } from './repeat';

describe('repeat rules', () => {
  const cases: [Repeat, string | null, string][] = [
    [{ freq: 'once' }, null, 'Happens once'],
    [{ freq: 'daily', interval: 1, ends: { kind: 'never' } }, 'FREQ=DAILY', 'Every day'],
    [
      { freq: 'weekly', interval: 1, days: ['TH'], ends: { kind: 'never' } },
      'FREQ=WEEKLY;BYDAY=TH',
      'Every Thursday',
    ],
    [
      { freq: 'weekly', interval: 2, days: ['TH', 'TU'], ends: { kind: 'never' } },
      'FREQ=WEEKLY;INTERVAL=2;BYDAY=TU,TH',
      'Every other week on Tuesday and Thursday',
    ],
    [
      { freq: 'monthly', interval: 1, week: 2, day: 'TU', ends: { kind: 'never' } },
      'FREQ=MONTHLY;BYDAY=2TU',
      '2nd Tuesday of every month',
    ],
    [
      { freq: 'monthly', interval: 1, week: -1, day: 'FR', ends: { kind: 'after', count: 6 } },
      'FREQ=MONTHLY;BYDAY=-1FR;COUNT=6',
      'Last Friday of every month, 6 times',
    ],
    [
      { freq: 'weekly', interval: 1, days: ['SU'], ends: { kind: 'on', date: '2027-03-01' } },
      'FREQ=WEEKLY;BYDAY=SU;UNTIL=20270301',
      'Every Sunday, until 2027-03-01',
    ],
  ];

  it.each(cases)('builds, parses back and describes %j', (repeat, rule, words) => {
    expect(buildRule(repeat)).toBe(rule);
    expect(describeRepeat(repeat)).toBe(words);
    if (rule) {
      const parsed = parseRule(rule);
      expect(buildRule(parsed)).toBe(rule);
    }
  });

  it('treats a missing or unknown rule as happening once', () => {
    expect(parseRule(null)).toEqual({ freq: 'once' });
    expect(parseRule('FREQ=YEARLY')).toEqual({ freq: 'once' });
  });

  it('finds the weekday and week of the month', () => {
    const thu = new Date(2026, 10, 5); // Thu Nov 5, 2026
    expect(weekdayOf(thu)).toBe('TH');
    expect(weekOfMonth(thu)).toBe(1);
    expect(weekOfMonth(new Date(2026, 10, 26))).toBe(-1); // last Thursday
    expect(weekOfMonth(new Date(2026, 10, 12))).toBe(2);
  });
});
