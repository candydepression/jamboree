// Type styles. Every piece of text in the app goes through <Text variant>.
import {
  Text as RNText,
  type TextProps,
  type TextStyle,
} from 'react-native';

import { fonts, useColors } from './theme';

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
