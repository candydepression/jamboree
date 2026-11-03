// The group chat for one date: the host and everyone confirmed. New messages arrive live.
import { Stack, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/features/auth/AuthProvider';
import { useChat, useRemoveMessage, useSendMessage, useLiveChat } from '@/features/chat/api';
import { usePeople } from '@/features/jams/api';
import { formatStamp } from '@/lib/format';
import { Button, Field, Loading, Notice, radius, Row, space, Text, useColors } from '@/ui';

export default function Chat() {
  const { id, title } = useLocalSearchParams<{ id: string; title?: string }>();
  const c = useColors();
  const { userId } = useAuth();
  const chat = useChat(id);
  const people = usePeople(id, true);
  const send = useSendMessage(id);
  const remove = useRemoveMessage(id);
  const [draft, setDraft] = useState('');
  const list = useRef<FlatList>(null);

  useLiveChat(id);

  const names = new Map(people.data?.map((p) => [p.profile_id, p.display_name]));
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;

  if (chat.isPending) return <Loading />;
  const submit = () => {
    const body = draft.trim();
    if (!body) return;
    send.mutate(body, { onSuccess: () => setDraft('') });
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }} edges={['bottom', 'left', 'right']}>
      <Stack.Screen options={{ title: title ?? 'Chat' }} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <FlatList
          ref={list}
          data={chat.data ?? []}
          keyExtractor={(m) => m.id}
          contentContainerStyle={{ padding: space.lg, gap: space.md, maxWidth: 640, width: '100%', alignSelf: 'center' }}
          onContentSizeChange={() => list.current?.scrollToEnd({ animated: false })}
          ListEmptyComponent={<Notice>Say hi, share a set list, sort out who brings the amp.</Notice>}
          renderItem={({ item: m }) => {
            const mine = m.author_id === userId;
            return (
              <View style={{ alignSelf: mine ? 'flex-end' : 'flex-start', maxWidth: '85%', gap: 2 }}>
                <Text variant="label">
                  {m.author_id ? (mine ? 'YOU' : (names.get(m.author_id) ?? 'SOMEONE').toUpperCase()) : 'DELETED USER'} ·{' '}
                  {formatStamp(m.created_at, tz)}
                </Text>
                <Pressable
                  disabled={!mine || !!m.deleted_at}
                  onLongPress={() => remove.mutate(m.id)}
                  accessibilityHint={mine ? 'Long press to remove' : undefined}
                  style={{ backgroundColor: mine ? c.greenSoft : c.surface, borderRadius: radius.md, padding: space.md }}>
                  <Text muted={!!m.deleted_at}>{m.deleted_at ? 'Message removed' : m.body}</Text>
                </Pressable>
              </View>
            );
          }}
        />
        {chat.error ? <Notice tone="danger">{chat.error.message}</Notice> : null}
        <Row gap={space.sm} style={{ padding: space.md, borderTopWidth: 1, borderTopColor: c.line, flexWrap: 'nowrap', alignItems: 'flex-end' }}>
          <Field label="Message" value={draft} onChangeText={setDraft} multiline maxLength={2000} onSubmitEditing={submit} />
          <Button title="Send" onPress={submit} loading={send.isPending} disabled={!draft.trim()} />
        </Row>
        {send.error ? <Notice tone="danger">{send.error.message}</Notice> : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
