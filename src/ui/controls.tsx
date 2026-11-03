// Things people tap and type into. All meet 44pt touch targets and carry accessibility roles.
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Switch,
  Text as RNText,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';

import { Text } from './Text';
import { fonts, radius, space, useColors, type Colors } from './theme';

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

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
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
