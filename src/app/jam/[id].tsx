// The jam page: what, when, who's going, and the RSVP. The address appears once you're in.
import * as Linking from 'expo-linking';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Linking as RNLinking, Platform, Share, View } from 'react-native';

import { useAuth } from '@/features/auth/AuthProvider';
import { useAddress, useFollowJam, useInviteLink, useJam, usePeople } from '@/features/jams/api';
import { JamMap } from '@/features/jams/map/JamMap';
import type { JamDetail, RsvpRole, SessionSummary } from '@/features/jams/types';
import { useCancelRsvp, useRsvp } from '@/features/rsvps/api';
import { formatDay, formatStamp, formatTime, spotsLabel } from '@/lib/format';
import { describeRepeat, parseRule } from '@/lib/repeat';
import { Avatar, Button, Card, Chip, Field, Loading, Notice, Row, Screen, Section, Segmented, space, Text } from '@/ui';

export default function JamPage() {
  const { id, session } = useLocalSearchParams<{ id: string; session?: string }>();
  const jam = useJam(id);
  const [picked, setPicked] = useState<string | undefined>(session);

  if (jam.isPending) return <Loading />;
  if (jam.error || !jam.data) {
    return (
      <Screen>
        <Text variant="title">Jam not found</Text>
        <Text muted>{jam.error?.message ?? 'It may be invite-only, or it was taken down.'}</Text>
      </Screen>
    );
  }

  const j = jam.data;
  const date = j.sessions.find((s) => s.id === picked) ?? j.sessions[0];

  return (
    <Screen>
      <Stack.Screen options={{ title: '' }} />
      {j.fuzzy_lat != null && j.fuzzy_lng != null ? (
        <View>
          <JamMap still height={200} pins={[{ id: j.id, lat: j.fuzzy_lat, lng: j.fuzzy_lng, label: j.title }]} />
          <Text variant="label" style={{ marginTop: space.xs }}>
            SOMEWHERE IN THIS CIRCLE · EXACT ADDRESS ONCE YOU’RE IN
          </Text>
        </View>
      ) : null}

      <View style={{ gap: space.sm }}>
        {date ? <Text variant="stamp">{formatStamp(date.starts_at, j.timezone)}</Text> : null}
        <Text variant="title">{j.title}</Text>
        <Text muted>
          {[j.venue?.name, j.neighborhood].filter(Boolean).join(' · ') || 'Seattle'} · hosted by {j.host_label}
        </Text>
        <Row gap={6}>
          {j.visibility === 'invite_only' ? <Chip label="Invite only" tone="mauve" /> : null}
          {j.approval_required ? <Chip label="Host approves" tone="mauve" /> : null}
          {j.genres.map((g) => <Chip key={g} label={g} />)}
        </Row>
      </View>

      {j.sessions.length > 1 ? (
        <Section label={describeRepeat(parseRule(j.repeat_rule))}>
          <Row gap={6}>
            {j.sessions.map((s) => (
              <Chip key={s.id} mono label={formatDay(s.starts_at, j.timezone)} selected={s.id === date?.id} onPress={() => setPicked(s.id)} />
            ))}
          </Row>
        </Section>
      ) : null}

      {date ? <DateDetails jam={j} date={date} /> : <Notice>No upcoming dates.</Notice>}

      {j.vibe || j.description ? (
        <Section label="About">
          {j.vibe ? <Text style={{ fontStyle: 'italic' }}>{j.vibe}</Text> : null}
          {j.description ? <Text>{j.description}</Text> : null}
        </Section>
      ) : null}

      {j.wanted.length ? (
        <Section label="Looking for">
          <Row gap={6}>{j.wanted.map((w) => <Chip key={w} label={w} />)}</Row>
        </Section>
      ) : null}

      <FollowButton jam={j} />
    </Screen>
  );
}

function DateDetails({ jam: j, date }: { jam: JamDetail; date: SessionSummary }) {
  const { userId } = useAuth();
  const inToday = date.my_status === 'confirmed';
  const insider = j.is_host || inToday;
  const address = useAddress(date.id, insider);
  const people = usePeople(date.id, insider);

  return (
    <View style={{ gap: space.lg }}>
      <Card>
        <Text variant="label">THIS DATE</Text>
        <Text>
          {formatTime(date.starts_at, j.timezone)} to {formatTime(date.ends_at, j.timezone)}
        </Text>
        <Text variant="stamp">
          {spotsLabel(date.players_in, j.player_cap, 'players')}
          {j.listeners_allowed ? ` · ${spotsLabel(date.listeners_in, j.listener_cap, 'listeners')}` : ' · players only'}
        </Text>
        {date.note ? <Text variant="small" muted>Host note: {date.note}</Text> : null}
      </Card>

      {j.is_host ? <HostTools jam={j} date={date} /> : userId ? <RsvpBox jam={j} date={date} /> : (
        <Button title="Sign in to RSVP" onPress={() => router.push('/sign-in')} />
      )}

      {address.data ? (
        <Card tone="mauve">
          <Text variant="label">THE ADDRESS</Text>
          {address.data.place_name ? <Text variant="heading">{address.data.place_name}</Text> : null}
          <Text>{address.data.address}</Text>
          <Button
            title="Open in maps"
            kind="secondary"
            onPress={() =>
              RNLinking.openURL(`https://www.google.com/maps/search/?api=1&query=${address.data!.lat},${address.data!.lng}`)
            }
          />
        </Card>
      ) : null}

      {insider ? (
        <Button
          title="Open the group chat"
          kind="secondary"
          onPress={() => router.push({ pathname: '/session/[id]/chat', params: { id: date.id, title: j.title } })}
        />
      ) : null}

      {people.data?.length ? (
        <Section label="Who's going">
          {people.data.filter((p) => p.status === 'confirmed').map((p) => (
            <Row key={p.profile_id} gap={space.md}>
              <Avatar name={p.display_name} size={36} tone={p.role === 'player' ? 'wood' : 'mauve'} />
              <Text>{p.display_name}</Text>
              <Text variant="label">{p.is_host ? 'HOSTING' : p.role === 'player' ? 'PLAYING' : 'LISTENING'}</Text>
            </Row>
          ))}
        </Section>
      ) : null}
    </View>
  );
}

function RsvpBox({ jam: j, date }: { jam: JamDetail; date: SessionSummary }) {
  const rsvp = useRsvp();
  const cancel = useCancelRsvp();
  const [role, setRole] = useState<RsvpRole>('player');
  const [note, setNote] = useState('');
  const error = rsvp.error ?? cancel.error;

  if (date.my_status === 'confirmed' || date.my_status === 'requested') {
    const waiting = date.my_status === 'requested';
    return (
      <Card tone="outline">
        <Text variant="heading">
          {waiting ? 'You asked to join. The host will let you know.' : date.my_role === 'listener' ? 'You’re in, listening.' : 'You’re in, playing.'}
        </Text>
        <Button
          title={waiting ? 'Withdraw request' : 'I can’t make it'}
          kind="danger"
          loading={cancel.isPending}
          onPress={() => cancel.mutate(date.id)}
        />
        {error ? <Notice tone="danger">{error.message}</Notice> : null}
      </Card>
    );
  }
  if (date.my_status === 'declined') {
    return <Notice>The host couldn’t fit you in this time. Try another date.</Notice>;
  }

  const cap = role === 'player' ? j.player_cap : j.listener_cap;
  const taken = role === 'player' ? date.players_in : date.listeners_in;
  const full = !j.approval_required && cap != null && taken >= cap;

  return (
    <View style={{ gap: space.md }}>
      {j.listeners_allowed ? (
        <Segmented
          label="Coming as"
          value={role}
          onChange={setRole}
          options={[
            { value: 'player', label: 'Playing' },
            { value: 'listener', label: 'Listening' },
          ]}
        />
      ) : null}
      {j.approval_required ? (
        <Field
          label="A note for the host (optional)"
          value={note}
          onChangeText={setNote}
          multiline
          maxLength={500}
          placeholder="What you play, who you've jammed with…"
        />
      ) : null}
      <Button
        title={full ? 'Full' : j.approval_required ? 'Ask to join' : 'RSVP'}
        disabled={full}
        loading={rsvp.isPending}
        onPress={() => rsvp.mutate({ sessionId: date.id, role, note })}
      />
      {error ? <Notice tone="danger">{error.message}</Notice> : null}
    </View>
  );
}

function HostTools({ jam: j, date }: { jam: JamDetail; date: SessionSummary }) {
  const link = useInviteLink(j.id, j.visibility === 'invite_only');
  const url = link.data ? Linking.createURL(`/invite/${link.data}`) : null;

  return (
    <Card tone="outline">
      <Text variant="heading">You’re hosting this one.</Text>
      {j.approval_required ? (
        <Button
          title="See requests"
          onPress={() => router.push({ pathname: '/session/[id]/requests', params: { id: date.id, title: j.title } })}
        />
      ) : null}
      {url ? (
        <>
          <Text variant="small" muted>Invite link (anyone with it can see this jam):</Text>
          <Text variant="stamp" selectable>{url}</Text>
          <Button
            title={Platform.OS === 'web' ? 'Share or copy the link' : 'Share the invite link'}
            kind="secondary"
            // Some desktop browsers can't share; the link above is selectable to copy instead.
            onPress={() => Share.share({ message: `Come play: ${j.title} ${url}`, url }).catch(() => undefined)}
          />
        </>
      ) : null}
    </Card>
  );
}

function FollowButton({ jam: j }: { jam: JamDetail }) {
  const { userId } = useAuth();
  const follow = useFollowJam(j.id);
  if (!userId || j.is_host) return null;
  return (
    <Button
      title={j.is_following ? 'Following · tap to stop' : 'Follow this jam for new dates and changes'}
      kind="ghost"
      loading={follow.isPending}
      onPress={() => follow.mutate(!j.is_following)}
    />
  );
}
