// People and status: avatars, inline notices, the loading state.
import { type ReactNode } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text as RNText,
  View,
} from 'react-native';

import { Text } from './Text';
import { fonts, useColors } from './theme';

export function Avatar({ name, size = 40, tone = 'wood' }: { name: string; size?: number; tone?: 'wood' | 'green' | 'mauve' }) {
  const c = useColors();
  const bg = tone === 'green' ? c.primary : tone === 'mauve' ? c.chip : c.wood;
  const fg = tone === 'mauve' ? c.onChip : '#FFFFFF';
  return (
    <View
      accessible
      accessibilityLabel={name}
      style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
      <RNText style={{ color: fg, fontFamily: fonts.semibold, fontSize: size * 0.4 }}>
        {(name.trim()[0] ?? '?').toUpperCase()}
      </RNText>
    </View>
  );
}

export function Notice({ children, tone = 'muted' }: { children: ReactNode; tone?: 'muted' | 'danger' }) {
  const c = useColors();
  return (
    <Text variant="small" color={tone === 'danger' ? c.danger : c.muted} accessibilityLiveRegion="polite">
      {children}
    </Text>
  );
}

export function Loading() {
  const c = useColors();
  return (
    <View style={[styles.fill, styles.center, { backgroundColor: c.bg }]}>
      <ActivityIndicator color={c.accent} />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
});
