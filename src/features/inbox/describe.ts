// Plain words for each kind of notice the database creates.
import type { Notification } from './api';

export type Payload = { jam_id?: string; session_id?: string; title?: string; role?: string; starts_at?: string; note?: string };

export function describe(n: Notification): string {
  const p = n.payload as Payload;
  const jam = p.title ?? 'a jam';
  switch (n.type) {
    case 'request_received': return `Someone asked to ${p.role === 'listener' ? 'listen at' : 'play at'} ${jam}.`;
    case 'rsvp_received': return `New ${p.role ?? 'player'} RSVP for ${jam}.`;
    case 'rsvp_cancelled': return `Someone can’t make it anymore.`;
    case 'request_approved': return `You’re in for ${jam}. The address is on the jam page.`;
    case 'request_declined': return `The host of ${jam} couldn’t fit you in this time.`;
    case 'session_cancelled': return `${jam} is off for this date.${p.note ? ` “${p.note}”` : ''}`;
    case 'session_changed': return `${jam} moved to a new time.`;
    case 'reminder': return `Reminder: ${jam} is coming up.`;
    case 'new_jam_from_followed': return `New jam from someone you follow: ${jam}.`;
    case 'claim_approved': return 'Your venue claim was approved. Its jams are yours to manage.';
    case 'claim_rejected': return 'Your venue claim was not approved.';
    default: return 'Something changed.';
  }
}
