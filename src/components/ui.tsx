// The small set of building blocks every screen uses. Styling lives here, not in screens.
import { type ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text as RNText,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { fonts, radius, space, useColors, type Colors } from '@/theme';

// Text --------------------------------------------------------------------------

type Variant = 'title' | 'heading' | 'body' | 'small' | 'label' | 'stamp';

const variants: Record<Variant, TextStyle> = {
  title: { fontFamily: fonts.semibold, fontSize: 28, lineHeight: 33 },
  heading: { fontFamily: fonts.semibold, fontSize: 19, lineHeight: 24 },
  body: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 23 },
  small: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20 },
  label: { fontFamily: fonts.mono, fontSize: 11, letterSpacing: 1.3, lineHeight: 15 },
  stamp: { fontFamily: fonts.mono, fontSize: 13, letterSpacing: 0.6, lineHeight: 18 },
};

export function Text({
  variant = 'body',
  muted,
  color,
  style,
  ...props
}: TextProps & { variant?: Variant; muted?: boolean; color?: string }) {
  const c = useColors();
  return (
    <RNText
      {...props}
      style={[variants[variant], { color: color ?? (muted || variant === 'label' ? c.muted : c.ink) }, style]}
    />
  );
}

// Layout ------------------------------------------------------------------------

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

// Controls ----------------------------------------------------------------------

export function Button({
  title,
  onPress,
  kind = 'primary',
  loading,
  disabled,
  style,
  accessibilityLabel,
}: {
  title: string;
  onPress?: () => void;
  kind?: 'primary' | 'secondary' | 'ghost' | 'danger';
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}) {
  const c = useColors();
  const look = buttonLook(c, kind);
  const off = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ disabled: !!off, busy: !!loading }}
      disabled={off}
      onPress={onPress}
      style={({ pressed }) => [styles.button, look.box, { opacity: off ? 0.55 : pressed ? 0.85 : 1 }, style]}>
      {loading ? (
        <ActivityIndicator color={look.text} />
      ) : (
        <RNText style={[styles.buttonText, { color: look.text }]}>{title}</RNText>
      )}
    </Pressable>
  );
}

function buttonLook(c: Colors, kind: 'primary' | 'secondary' | 'ghost' | 'danger') {
  switch (kind) {
    case 'primary':
      return { box: { backgroundColor: c.primary }, text: c.onPrimary };
    case 'secondary':
      return { box: { backgroundColor: c.surface, borderWidth: 1, borderColor: c.line }, text: c.ink };
    case 'danger':
      return { box: { borderWidth: 1, borderColor: c.danger }, text: c.danger };
    case 'ghost':
      return { box: { backgroundColor: 'transparent' }, text: c.ink };
  }
}

export function Chip({
  label,
  selected,
  onPress,
  tone = 'plain',
  mono,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  tone?: 'plain' | 'mauve';
  mono?: boolean;
}) {
  const c = useColors();
  const on = selected || tone === 'mauve';
  const bg = selected ? c.primary : tone === 'mauve' ? c.chip : 'transparent';
  const fg = selected ? c.onPrimary : tone === 'mauve' ? c.onChip : c.ink;
  const content = (
    <RNText style={[styles.chipText, { color: fg, fontFamily: mono ? fonts.mono : fonts.medium }]}>{label}</RNText>
  );
  const box = [styles.chip, { backgroundColor: bg, borderColor: on ? bg : c.lineStrong }];
  if (!onPress) return <View style={box}>{content}</View>;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      onPress={onPress}
      hitSlop={4}
      style={({ pressed }) => [...box, styles.chipPressable, pressed && { opacity: 0.8 }]}>
      {content}
    </Pressable>
  );
}

export function Field({ label, hint, ...props }: TextInputProps & { label: string; hint?: string }) {
  const c = useColors();
  return (
    <View style={{ gap: 6, flex: 1 }}>
      <Text variant="small" style={{ fontFamily: fonts.medium }}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={c.muted}
        {...props}
        style={[styles.input, { borderColor: c.lineStrong, backgroundColor: c.surface, color: c.ink }, props.multiline && styles.inputMulti, props.style]}
      />
      {hint ? <Text variant="small" muted>{hint}</Text> : null}
    </View>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  label: string;
}) {
  const c = useColors();
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={label} style={[styles.segmented, { backgroundColor: c.surface }]}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="radio"
            accessibilityState={{ checked: on }}
            onPress={() => onChange(o.value)}
            style={[styles.segment, on && { backgroundColor: c.bg, ...styles.segmentOn }]}>
            <RNText style={[styles.segmentText, { color: on ? c.ink : c.muted, fontFamily: on ? fonts.semibold : fonts.medium }]}>
              {o.label}
            </RNText>
          </Pressable>
        );
      })}
    </View>
  );
}

export function SwitchRow({
  label,
  detail,
  value,
  onChange,
}: {
  label: string;
  detail?: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  const c = useColors();
  return (
    <View style={[styles.row, { justifyContent: 'space-between', gap: space.md }]}>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ fontFamily: fonts.semibold }}>{label}</Text>
        {detail ? <Text variant="small" muted>{detail}</Text> : null}
      </View>
      <Switch
        accessibilityLabel={label}
        value={value}
        onValueChange={onChange}
        trackColor={{ true: c.primary, false: c.lineStrong }}
        thumbColor="#FFFFFF"
        {...({ activeThumbColor: '#FFFFFF' } as object)}
      />
    </View>
  );
}

export function Stepper({
  label,
  value,
  onChange,
  min = 1,
  max = 99,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
}) {
  const c = useColors();
  const btn = (delta: number, sign: string, name: string) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={name}
      disabled={value + delta < min || value + delta > max}
      onPress={() => onChange(value + delta)}
      style={styles.stepBtn}>
      <RNText style={[styles.stepSign, { color: c.ink }]}>{sign}</RNText>
    </Pressable>
  );
  return (
    <View style={[styles.row, { justifyContent: 'space-between' }]}>
      <Text variant="small" style={{ fontFamily: fonts.medium }}>{label}</Text>
      <View style={[styles.row, styles.stepper, { borderColor: c.lineStrong }]}>
        {btn(-1, '−', `Fewer: ${label}`)}
        <Text variant="stamp" style={styles.stepValue} accessibilityLiveRegion="polite">{value}</Text>
        {btn(1, '+', `More: ${label}`)}
      </View>
    </View>
  );
}

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
  screenBody: { padding: space.xl, gap: space.xl, paddingBottom: 48, width: '100%', maxWidth: 640, alignSelf: 'center' },
  footer: { paddingHorizontal: space.xl, paddingTop: space.md, paddingBottom: space.xl, borderTopWidth: 1, gap: space.sm },
  row: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  card: { borderRadius: radius.md, padding: space.lg, gap: space.sm },
  button: { minHeight: 52, borderRadius: 26, paddingHorizontal: space.xl, alignItems: 'center', justifyContent: 'center' },
  buttonText: { fontFamily: fonts.semibold, fontSize: 16 },
  chip: { borderRadius: radius.pill, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 6, alignSelf: 'flex-start' },
  chipPressable: { minHeight: 40, justifyContent: 'center' },
  chipText: { fontSize: 14 },
  input: { minHeight: 50, borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, fontFamily: fonts.regular, fontSize: 16 },
  inputMulti: { minHeight: 96, paddingTop: 12, textAlignVertical: 'top' },
  segmented: { flexDirection: 'row', padding: 4, borderRadius: radius.md, gap: 4 },
  segment: { flex: 1, minHeight: 44, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  segmentOn: { shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
  segmentText: { fontSize: 15 },
  stepper: { borderWidth: 1, borderRadius: 22, gap: 0 },
  stepBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  stepSign: { fontSize: 20 },
  stepValue: { minWidth: 28, textAlign: 'center', fontFamily: fonts.monoBold, fontSize: 16 },
});
