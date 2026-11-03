import { describe, expect, it } from 'vitest';

import { dateBlock, formatStamp, localDate, spotsLabel, zonedInstant } from './format';

const SEA = 'America/Los_Angeles';

describe('format', () => {
  it('shows times in the jam timezone', () => {
    const iso = '2026-11-06T03:30:00Z'; // Thu Nov 5, 7:30 PM in Seattle
    expect(formatStamp(iso, SEA)).toBe('THU · NOV 5 · 7:30 PM');
    expect(dateBlock(iso, SEA)).toEqual({ top: 'THU', main: '7:30' });
    expect(dateBlock('2026-11-06T04:00:00Z', SEA)).toEqual({ top: 'THU', main: '8 PM' });
    expect(localDate(iso, SEA)).toBe('2026-11-05');
  });

  it('turns a wall-clock time into the right instant, across daylight saving', () => {
    expect(zonedInstant('2026-11-05', '19:30', SEA).toISOString()).toBe('2026-11-06T03:30:00.000Z');
    expect(zonedInstant('2026-07-02', '19:30', SEA).toISOString()).toBe('2026-07-03T02:30:00.000Z');
  });

  it('labels spots with or without a cap', () => {
    expect(spotsLabel(5, 8, 'players')).toBe('5/8 players');
    expect(spotsLabel(3, null, 'listeners')).toBe('3 listeners');
  });
});
