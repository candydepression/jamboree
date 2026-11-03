// Going: the dates you're hosting, playing, listening at, or waiting to hear back on.
import { View } from 'react-native';

import { useAuth } from '@/features/auth/AuthProvider';
import { SignInPrompt } from '@/features/auth/SignInPrompt';
import { useMyJams } from '@/features/jams/api';
import { JamCard } from '@/features/jams/JamCard';
import type { JamListing } from '@/features/jams/types';
import { Notice, Screen, Section, space, Text } from '@/ui';

export default function Going() {
  const { userId } = useAuth();
  const mine = useMyJams(!!userId);

  if (!userId) return <SignInPrompt text="Sign in to see the jams you're going to and hosting." />;

  const rows = mine.data ?? [];
  const groups: [string, JamListing[]][] = [
    ['Hosting', rows.filter((j) => j.is_host)],
    ['Going', rows.filter((j) => !j.is_host && j.my_status === 'confirmed')],
    ['Waiting on the host', rows.filter((j) => !j.is_host && j.my_status === 'requested')],
  ];

  return (
    <Screen>
      <Text variant="title">Going</Text>
      {mine.error ? <Notice tone="danger">{mine.error.message}</Notice> : null}
      {!mine.isPending && !rows.length ? (
        <Notice>Nothing on your calendar yet. Find a jam on Explore and RSVP.</Notice>
      ) : null}
      {groups.map(([label, list]) =>
        list.length ? (
          <Section key={label} label={label}>
            <View style={{ gap: space.md }}>
              {list.map((j) => <JamCard key={j.session_id} jam={j} />)}
            </View>
          </Section>
        ) : null,
      )}
    </Screen>
  );
}
