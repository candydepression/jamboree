// Post a jam. During the beta, posting needs a member invite code.
import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { SignInPrompt } from '@/components/SignInPrompt';
import { Button, Card, Chip, Field, Notice, Row, Screen, Section, Segmented, Stepper, SwitchRow, Text } from '@/components/ui';
import { searchPlaces, useCreateJam, useOptions, useRedeemInvite, type Place } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { localDate, zonedInstant } from '@/lib/format';
import { buildRule, describeRepeat, WEEKDAYS, weekdayOf, weekOfMonth, type Repeat, type Weekday } from '@/lib/repeat';
import { space } from '@/theme';

const TZ = 'America/Los_Angeles';
const DAY_SHORT: Record<Weekday, string> = { MO: 'Mon', TU: 'Tue', WE: 'Wed', TH: 'Thu', FR: 'Fri', SA: 'Sat', SU: 'Sun' };

export default function Post() {
  const { userId, profile } = useAuth();
  if (!userId) return <SignInPrompt title="Host a jam" text="Sign in to post a jam." />;
  if (!profile?.can_post) return <RedeemInvite />;
  return <PostForm />;
}

function RedeemInvite() {
  const redeem = useRedeemInvite();
  const [code, setCode] = useState('');
  return (
    <Screen>
      <Text variant="title">Host a jam</Text>
      <Text muted>
        During the beta, anyone can browse and RSVP. Posting opens with an invite code from a member.
      </Text>
      <Field label="Invite code" value={code} onChangeText={setCode} autoCapitalize="characters" placeholder="A1B2C3D4E5" />
      <Button title="Use code" disabled={code.trim().length < 6} loading={redeem.isPending} onPress={() => redeem.mutate(code)} />
      {redeem.error ? <Notice tone="danger">{redeem.error.message}</Notice> : null}
    </Screen>
  );
}

function PostForm() {
  const create = useCreateJam();
  const genres = useOptions('genres');
  const instruments = useOptions('instruments');

  const [title, setTitle] = useState('');
  const [date, setDate] = useState(localDate(new Date(), TZ));
  const [time, setTime] = useState('19:30');
  const [hours, setHours] = useState(3);
  const [freq, setFreq] = useState<Repeat['freq']>('once');
  const [days, setDays] = useState<Weekday[]>([]);
  const [query, setQuery] = useState('');
  const [places, setPlaces] = useState<Place[]>([]);
  const [place, setPlace] = useState<Place | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [capPlayers, setCapPlayers] = useState(true);
  const [playerCap, setPlayerCap] = useState(8);
  const [listenersAllowed, setListenersAllowed] = useState(true);
  const [capListeners, setCapListeners] = useState(false);
  const [listenerCap, setListenerCap] = useState(10);
  const [approval, setApproval] = useState(false);
  const [inviteOnly, setInviteOnly] = useState(false);
  const [genreIds, setGenreIds] = useState<number[]>([]);
  const [wantedIds, setWantedIds] = useState<number[]>([]);
  const [vibe, setVibe] = useState('');
  const [description, setDescription] = useState('');

  const validDate = /^\d{4}-\d{2}-\d{2}$/.test(date) && !Number.isNaN(Date.parse(date));
  const validTime = /^([01]?\d|2[0-3]):[0-5]\d$/.test(time);
  const day = validDate ? new Date(`${date}T12:00:00`) : new Date();
  const repeat: Repeat =
    freq === 'once'
      ? { freq }
      : freq === 'daily'
        ? { freq, interval: 1, ends: { kind: 'never' } }
        : freq === 'weekly'
          ? { freq, interval: 1, days: days.length ? days : [weekdayOf(day)], ends: { kind: 'never' } }
          : { freq, interval: 1, week: weekOfMonth(day), day: weekdayOf(day), ends: { kind: 'never' } };

  const ready = title.trim() && validDate && validTime && place;

  async function search() {
    setSearchError(null);
    try {
      setPlaces(await searchPlaces(query.trim()));
    } catch (e) {
      setSearchError((e as Error).message);
    }
  }

  function submit() {
    if (!ready || !place) return;
    create.mutate(
      {
        p_title: title.trim(),
        p_start_time: zonedInstant(date, time, TZ).toISOString(),
        p_duration_minutes: hours * 60,
        p_timezone: TZ,
        p_repeat_rule: buildRule(repeat) ?? undefined,
        p_address: place.address,
        p_place_name: place.label,
        p_neighborhood: place.neighborhood ?? undefined,
        p_lat: place.lat,
        p_lng: place.lng,
        p_visibility: inviteOnly ? 'invite_only' : 'public',
        p_approval_required: approval,
        p_player_cap: capPlayers ? playerCap : undefined,
        p_listeners_allowed: listenersAllowed,
        p_listener_cap: listenersAllowed && capListeners ? listenerCap : undefined,
        p_genre_ids: genreIds,
        p_wanted_ids: wantedIds,
        p_vibe: vibe,
        p_description: description,
      },
      { onSuccess: (id) => router.push({ pathname: '/jam/[id]', params: { id } }) },
    );
  }

  const toggle = (list: number[], set: (v: number[]) => void, id: number) =>
    set(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);

  return (
    <Screen
      footer={
        <>
          {create.error ? <Notice tone="danger">{create.error.message}</Notice> : null}
          <Button title="Post jam" disabled={!ready} loading={create.isPending} onPress={submit} />
        </>
      }>
      <Text variant="title">Host a jam</Text>
      <Field label="What’s it called?" value={title} onChangeText={setTitle} maxLength={80} placeholder="Thursday standards at Maya’s" />

      <Section label="When">
        <Row gap={space.md} style={{ flexWrap: 'nowrap', alignItems: 'flex-start' }}>
          <Field label="Date" value={date} onChangeText={setDate} placeholder="2026-11-12" hint={validDate ? undefined : 'YYYY-MM-DD'} />
          <Field label="Starts" value={time} onChangeText={setTime} placeholder="19:30" hint={validTime ? undefined : '24-hour, like 19:30'} />
        </Row>
        <Stepper label="Hours" value={hours} onChange={setHours} min={1} max={12} />
        <Segmented
          label="Repeats"
          value={freq}
          onChange={setFreq}
          options={[
            { value: 'once', label: 'Once' },
            { value: 'weekly', label: 'Weekly' },
            { value: 'monthly', label: 'Monthly' },
          ]}
        />
        {freq === 'weekly' ? (
          <Row gap={6}>
            {WEEKDAYS.map((d) => (
              <Chip
                key={d}
                label={DAY_SHORT[d]}
                selected={(days.length ? days : [weekdayOf(day)]).includes(d)}
                onPress={() => setDays((cur) => {
                  const base = cur.length ? cur : [weekdayOf(day)];
                  const next = base.includes(d) ? base.filter((x) => x !== d) : [...base, d];
                  return next.length ? next : base;
                })}
              />
            ))}
          </Row>
        ) : null}
        <Text variant="stamp">{describeRepeat(repeat).toUpperCase()}</Text>
      </Section>

      <Section label="Where">
        <Row gap={space.sm} style={{ flexWrap: 'nowrap', alignItems: 'flex-end' }}>
          <Field label="Address or place" value={query} onChangeText={setQuery} onSubmitEditing={search} placeholder="Royal Room, or 123 Main St" />
          <Button title="Find" kind="secondary" onPress={search} disabled={query.trim().length < 3} />
        </Row>
        {searchError ? <Notice tone="danger">{searchError}</Notice> : null}
        {places.map((p) => (
          <Chip key={`${p.lat},${p.lng}`} label={p.address} selected={place?.address === p.address} onPress={() => setPlace(p)} />
        ))}
        <Text variant="small" muted>
          The map shows a 1-mile circle, not the spot. People see the address once they’re in.
        </Text>
      </Section>

      <Section label="Who">
        <SwitchRow label="Limit players" value={capPlayers} onChange={setCapPlayers} />
        {capPlayers ? <Stepper label="Player spots" value={playerCap} onChange={setPlayerCap} min={1} max={60} /> : null}
        <SwitchRow label="Listeners welcome" value={listenersAllowed} onChange={setListenersAllowed} />
        {listenersAllowed ? (
          <>
            <SwitchRow label="Limit listeners" value={capListeners} onChange={setCapListeners} />
            {capListeners ? <Stepper label="Listener spots" value={listenerCap} onChange={setListenerCap} min={1} max={200} /> : null}
          </>
        ) : null}
        <SwitchRow label="I approve each person" detail="Good for home jams. You see who they are first." value={approval} onChange={setApproval} />
        <SwitchRow label="Invite only" detail="Hidden from the map. You get a link to share." value={inviteOnly} onChange={setInviteOnly} />
      </Section>

      <Section label="Style">
        <Row gap={6}>
          {genres.data?.map((g) => (
            <Chip key={g.id} label={g.name} selected={genreIds.includes(g.id)} onPress={() => toggle(genreIds, setGenreIds, g.id)} />
          ))}
        </Row>
      </Section>

      <Section label="Looking for">
        <Row gap={6}>
          {instruments.data?.map((i) => (
            <Chip key={i.id} label={i.name} selected={wantedIds.includes(i.id)} onPress={() => toggle(wantedIds, setWantedIds, i.id)} />
          ))}
        </Row>
      </Section>

      <Card>
        <Field label="The vibe, in a line" value={vibe} onChangeText={setVibe} maxLength={200} placeholder="Real Book, all levels, coffee on" />
        <View style={{ height: space.md }} />
        <Field label="Anything else" value={description} onChangeText={setDescription} multiline maxLength={2000} />
      </Card>
    </Screen>
  );
}
