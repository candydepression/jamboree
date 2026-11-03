// One upcoming date in a list: day and time on the left, what and where on the right.
import { Link } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { dateBlock, formatDay, spotsLabel } from '@/lib/format';
import { Chip, fonts, radius, Row, space, Text, useColors } from '@/ui';

import type { JamListing } from './types';

export function JamCard({ jam, selected, onFocus }: { jam: JamListing; selected?: boolean; onFocus?: () => void }) {
  const c = useColors();
  const when = dateBlock(jam.starts_at, jam.timezone);
  const where = jam.venue_name ?? jam.neighborhood ?? 'Seattle';
  const status = statusLabel(jam);

  return (
    <Link href={{ pathname: '/jam/[id]', params: { id: jam.jam_id, session: jam.session_id } }} asChild>
      <Pressable
        onHoverIn={onFocus}
        onFocus={onFocus}
        accessibilityLabel={`${jam.title}, ${formatDay(jam.starts_at, jam.timezone)} ${when.main}, ${where}`}
        style={({ pressed }) => [
          styles.card,
          { borderColor: selected ? c.primary : c.line, backgroundColor: c.bg, opacity: pressed ? 0.85 : 1 },
        ]}>
        <View style={[styles.when, { backgroundColor: c.surface }]}>
          <Text variant="label">{when.top}</Text>
          <Text style={{ fontFamily: fonts.monoBold, fontSize: 15 }}>{when.main}</Text>
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <Text variant="heading" numberOfLines={2}>{jam.title}</Text>
          <Text variant="small" muted numberOfLines={1}>
            {where} · {jam.host_label}
          </Text>
          <Row gap={6} style={{ marginTop: 4 }}>
            {status ? <Chip label={status} tone="mauve" /> : null}
            {jam.genres.slice(0, 2).map((g) => <Chip key={g} label={g} />)}
            <Text variant="label" style={{ marginLeft: 2 }}>
              {spotsLabel(jam.players_in, jam.player_cap, 'players')}
            </Text>
          </Row>
        </View>
      </Pressable>
    </Link>
  );
}

function statusLabel(jam: JamListing): string | null {
  if (jam.is_host) return 'Hosting';
  if (jam.my_status === 'confirmed') return jam.my_role === 'listener' ? 'Going to listen' : 'Playing';
  if (jam.my_status === 'requested') return 'Asked to join';
  if (jam.visibility === 'invite_only') return 'Invite only';
  if (jam.approval_required) return 'Host approves';
  return null;
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', gap: space.md, padding: space.md, borderRadius: radius.md, borderWidth: 1 },
  when: { width: 64, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center', paddingVertical: space.sm, gap: 2 },
});
