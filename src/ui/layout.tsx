// Page structure: the screen frame, rows, cards and labeled sections.
import { type ReactNode } from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Text } from './Text';
import { radius, space, useColors } from './theme';

export function Screen({
  children,
  scroll = true,
  footer,
  contentStyle,
}: {
  children: ReactNode;
  scroll?: boolean;
  footer?: ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
}) {
  const c = useColors();
  const body = [styles.screenBody, contentStyle];
  return (
    <SafeAreaView style={[styles.fill, { backgroundColor: c.bg }]} edges={['top', 'left', 'right']}>
      {scroll ? (
        <ScrollView contentContainerStyle={body} keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.fill, ...body]}>{children}</View>
      )}
      {footer ? (
        <View style={[styles.footer, { backgroundColor: c.bg, borderTopColor: c.line }]}>{footer}</View>
      ) : null}
    </SafeAreaView>
  );
}

export function Row({ children, gap = space.sm, style }: { children: ReactNode; gap?: number; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.row, { gap }, style]}>{children}</View>;
}

export function Card({ children, style, tone = 'surface' }: { children: ReactNode; style?: StyleProp<ViewStyle>; tone?: 'surface' | 'outline' | 'mauve' }) {
  const c = useColors();
  const tones: Record<string, ViewStyle> = {
    surface: { backgroundColor: c.surface },
    outline: { borderWidth: 1, borderColor: c.line },
    mauve: { backgroundColor: c.chipSoft },
  };
  return <View style={[styles.card, tones[tone], style]}>{children}</View>;
}

export function Section({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={{ gap: space.sm }}>
      <Text variant="label">{label.toUpperCase()}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  screenBody: { padding: space.xl, gap: space.xl, paddingBottom: 48, width: '100%', maxWidth: 640, alignSelf: 'center' },
  footer: { paddingHorizontal: space.xl, paddingTop: space.md, paddingBottom: space.xl, borderTopWidth: 1, gap: space.sm },
  row: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  card: { borderRadius: radius.md, padding: space.lg, gap: space.sm },
});
