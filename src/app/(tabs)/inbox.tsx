// Inbox: requests, approvals, changes and reminders, newest first.
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef } from 'react';
import { Pressable, View } from 'react-native';

import { SignInPrompt } from '@/components/SignInPrompt';
import { Notice, Screen, Text } from '@/components/ui';
import { useMarkAllRead, useNotifications, type Notification } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { formatStamp } from '@/lib/format';
import { radius, space, useColors } from '@/theme';

type Payload = { jam_id?: string; session_id?: string; title?: string; role?: string; starts_at?: string; note?: string };

const TZ = 'America/Los_Angeles';

/** Plain words for each kind of notice the database creates. */
function describe(n: Notification): string {
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

export default function Inbox() {
  const c = useColors();
  const { userId } = useAuth();
  const notes = useNotifications(!!userId);
  const { mutate: markAllRead } = useMarkAllRead();
  const hasUnread = useRef(false);
  useEffect(() => {
    hasUnread.current = !!notes.data?.some((n) => !n.read_at);
  }, [notes.data]);

  // Leaving the inbox marks everything as read, like most messaging apps.
  useFocusEffect(
    useCallback(() => () => {
      if (hasUnread.current) markAllRead();
    }, [markAllRead]),
  );

  if (!userId) return <SignInPrompt title="Inbox" text="Sign in to get requests, approvals and reminders." />;

  return (
    <Screen>
      <Text variant="title">Inbox</Text>
      {notes.error ? <Notice tone="danger">{notes.error.message}</Notice> : null}
      {!notes.isPending && !notes.data?.length ? <Notice>Nothing yet. Requests and reminders land here.</Notice> : null}
      <View style={{ gap: space.sm }}>
        {notes.data?.map((n) => {
          const p = n.payload as Payload;
          const target = n.type === 'request_received' && p.session_id
            ? () => router.push({ pathname: '/session/[id]/requests', params: { id: p.session_id!, title: p.title } })
            : p.jam_id
              ? () => router.push({ pathname: '/jam/[id]', params: { id: p.jam_id!, session: p.session_id } })
              : undefined;
          return (
            <Pressable
              key={n.id}
              disabled={!target}
              onPress={target}
              style={{ padding: space.md, borderRadius: radius.md, gap: 4, backgroundColor: n.read_at ? c.bg : c.chipSoft, borderWidth: 1, borderColor: c.line }}>
              <Text>{describe(n)}</Text>
              <Text variant="label">{formatStamp(n.created_at, TZ)}</Text>
            </Pressable>
          );
        })}
      </View>
    </Screen>
  );
}
