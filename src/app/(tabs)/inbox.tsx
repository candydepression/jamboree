// Inbox: requests, approvals, changes and reminders, newest first.
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef } from 'react';
import { Pressable, View } from 'react-native';

import { useAuth } from '@/features/auth/AuthProvider';
import { SignInPrompt } from '@/features/auth/SignInPrompt';
import { useMarkAllRead, useNotifications } from '@/features/inbox/api';
import { describe, type Payload } from '@/features/inbox/describe';
import { DEFAULT_TIMEZONE } from '@/lib/config';
import { formatStamp } from '@/lib/format';
import { Notice, radius, Screen, space, Text, useColors } from '@/ui';

const TZ = DEFAULT_TIMEZONE;

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
