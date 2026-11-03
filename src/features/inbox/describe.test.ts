import { describe as suite, expect, it } from 'vitest';

import type { Notification } from './api';
import { describe } from './describe';

const note = (type: string, payload: object): Notification => ({
  id: '1', profile_id: 'p', type, payload: payload as Notification['payload'], created_at: '', read_at: null,
  push_sent_at: null, email_sent_at: null,
});

suite('inbox wording', () => {
  it('names the jam and the role', () => {
    expect(describe(note('request_received', { title: 'Thursday standards', role: 'listener' })))
      .toBe('Someone asked to listen at Thursday standards.');
    expect(describe(note('request_approved', { title: 'Thursday standards' })))
      .toBe('You’re in for Thursday standards. The address is on the jam page.');
  });

  it('quotes the host note on a cancelled date', () => {
    expect(describe(note('session_cancelled', { title: 'Folk night', note: 'Rained out' })))
      .toBe('Folk night is off for this date. “Rained out”');
  });

  it('never shows a blank for an unknown kind', () => {
    expect(describe(note('something_new', {}))).toBe('Something changed.');
  });
});
