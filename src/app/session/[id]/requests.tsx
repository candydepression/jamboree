// The host's request list, with what helps decide: what they play, who vouched, who you both know.
import { Stack, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';

import { Avatar, Button, Card, Chip, Loading, Notice, Row, Screen, Text } from '@/components/ui';
import { useDecide, useRequests, type JamRequest } from '@/lib/api';
import { space } from '@/theme';

const LEVELS: Record<string, string> = {
  just_starting: 'Just starting',
  some_experience: 'Some experience',
  seasoned: 'Seasoned',
  pro: 'Pro',
};

export default function Requests() {
  const { id, title } = useLocalSearchParams<{ id: string; title?: string }>();
  const requests = useRequests(id);

  if (requests.isPending) return <Loading />;
  return (
    <Screen>
      <Stack.Screen options={{ title: title ?? 'Requests' }} />
      {requests.error ? <Notice tone="danger">{requests.error.message}</Notice> : null}
      {!requests.data?.length ? <Notice>No one is waiting right now.</Notice> : null}
      {requests.data?.map((r) => <RequestCard key={r.rsvp_id} request={r} />)}
    </Screen>
  );
}

function RequestCard({ request: r }: { request: JamRequest }) {
  const decide = useDecide();
  const facts = [
    r.is_friend && 'Your friend',
    r.played_together > 0 && `Played together ${r.played_together}×`,
    r.people_you_both_know > 0 && `${r.people_you_both_know} people you both know`,
    r.invited_by_name && `Invited by ${r.invited_by_name}`,
  ].filter(Boolean) as string[];

  return (
    <Card tone="outline">
      <Row gap={space.md} style={{ flexWrap: 'nowrap' }}>
        <Avatar name={r.display_name} size={44} tone={r.role === 'player' ? 'wood' : 'mauve'} />
        <View style={{ flex: 1 }}>
          <Text variant="heading">{r.display_name}</Text>
          <Text variant="label">
            {r.role === 'player' ? 'WANTS TO PLAY' : 'WANTS TO LISTEN'}
            {r.experience_level ? ` · ${LEVELS[r.experience_level].toUpperCase()}` : ''}
          </Text>
        </View>
      </Row>
      {r.instruments.length ? <Row gap={6}>{r.instruments.map((i) => <Chip key={i} label={i} />)}</Row> : null}
      {facts.length ? <Row gap={6}>{facts.map((f) => <Chip key={f} label={f} tone="mauve" />)}</Row> : null}
      {r.note ? <Text>“{r.note}”</Text> : null}
      {r.bio ? <Text variant="small" muted numberOfLines={3}>{r.bio}</Text> : null}
      <Row gap={space.sm} style={{ flexWrap: 'nowrap' }}>
        <Button
          title="Not this time"
          kind="secondary"
          style={{ flex: 1 }}
          disabled={decide.isPending}
          onPress={() => decide.mutate({ rsvpId: r.rsvp_id, approve: false })}
        />
        <Button
          title="Let them in"
          style={{ flex: 1 }}
          loading={decide.isPending && decide.variables?.approve}
          disabled={decide.isPending}
          onPress={() => decide.mutate({ rsvpId: r.rsvp_id, approve: true })}
        />
      </Row>
      {decide.error ? <Notice tone="danger">{decide.error.message}</Notice> : null}
    </Card>
  );
}
