// Explore: the map and the list show the same jams, like browsing homes on a map.
import { useMemo, useState } from 'react';
import { Platform, View } from 'react-native';

import { useBrowse } from '@/features/jams/api';
import { JamCard } from '@/features/jams/JamCard';
import { JamMap } from '@/features/jams/map/JamMap';
import type { Bounds, JamListing } from '@/features/jams/types';
import { localDate } from '@/lib/format';
import { Chip, Notice, Row, Screen, Segmented, space, Text } from '@/ui';

type When = 'today' | 'week' | 'month';
const DAYS: Record<When, number> = { today: 1, week: 7, month: 28 };

export default function Explore() {
  const [when, setWhen] = useState<When>('week');
  const [view, setView] = useState<'map' | 'list'>(Platform.OS === 'web' ? 'map' : 'list');
  const [bounds, setBounds] = useState<Bounds | null>(null);
  const [genre, setGenre] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  // The list follows the map area only while the map is showing.
  const browse = useBrowse(DAYS[when], view === 'map' ? bounds : null);
  const all = useMemo(() => (browse.data ?? []).filter((j) => when !== 'today' || isToday(j)), [browse.data, when]);
  const genres = useMemo(() => [...new Set(all.flatMap((j) => j.genres))].sort(), [all]);
  const jams = genre ? all.filter((j) => j.genres.includes(genre)) : all;

  // One pin per jam, at its next date.
  const pins = useMemo(() => {
    const seen = new Map<string, { id: string; lat: number; lng: number; label: string }>();
    for (const j of jams) {
      if (j.fuzzy_lat == null || j.fuzzy_lng == null || seen.has(j.jam_id)) continue;
      seen.set(j.jam_id, { id: j.jam_id, lat: j.fuzzy_lat, lng: j.fuzzy_lng, label: j.title });
    }
    return [...seen.values()];
  }, [jams]);

  return (
    <Screen>
      <View style={{ gap: space.xs }}>
        <Text variant="label">ONETWOTHREEFOUR · SEATTLE</Text>
        <Text variant="title">Find a jam</Text>
      </View>

      <Segmented
        label="When"
        value={when}
        onChange={setWhen}
        options={[
          { value: 'today', label: 'Today' },
          { value: 'week', label: 'This week' },
          { value: 'month', label: '4 weeks' },
        ]}
      />

      {Platform.OS === 'web' ? (
        <Segmented
          label="View"
          value={view}
          onChange={setView}
          options={[
            { value: 'map', label: 'Map' },
            { value: 'list', label: 'List only' },
          ]}
        />
      ) : null}

      {view === 'map' ? (
        <JamMap pins={pins} selectedId={selected} onSelect={setSelected} onBoundsChange={setBounds} />
      ) : null}

      {genres.length > 1 ? (
        <Row gap={6}>
          <Chip label="All" selected={!genre} onPress={() => setGenre(null)} />
          {genres.map((g) => (
            <Chip key={g} label={g} selected={genre === g} onPress={() => setGenre(genre === g ? null : g)} />
          ))}
        </Row>
      ) : null}

      <View style={{ gap: space.md }}>
        <Text variant="label">
          {browse.isPending ? 'LOOKING…' : `${jams.length} ${jams.length === 1 ? 'DATE' : 'DATES'}${view === 'map' ? ' IN THIS AREA' : ''}`}
        </Text>
        {browse.error ? <Notice tone="danger">Couldn’t load jams. {browse.error.message}</Notice> : null}
        {!browse.isPending && !jams.length && !browse.error ? (
          <Notice>Nothing here yet. Try a longer stretch of time, or zoom the map out.</Notice>
        ) : null}
        {jams.map((j) => (
          <JamCard
            key={j.session_id}
            jam={j}
            selected={j.jam_id === selected}
            onFocus={() => setSelected(j.jam_id)}
          />
        ))}
      </View>
    </Screen>
  );
}

function isToday(j: JamListing) {
  return localDate(j.starts_at, j.timezone) === localDate(new Date(), j.timezone);
}
