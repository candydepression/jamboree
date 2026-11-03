import { useColorScheme } from 'react-native';

// Palette from the look board: white / black grounds, deep forest green, light mauve,
// natural oat and walnut. Every text/background pair here passes WCAG AA (4.5:1).
const light = {
  bg: '#FFFFFF',
  surface: '#F5F1EA',
  surfaceStrong: '#EDE6DA',
  ink: '#1B1A17',
  muted: '#5E5A52',
  line: '#E2DCD1',
  lineStrong: '#D6CFC2',
  accent: '#1F4A33',
  primary: '#1F4A33',
  onPrimary: '#FFFFFF',
  chip: '#D8BFCB',
  onChip: '#4A2A3B',
  chipSoft: '#F6EEF2',
  greenSoft: '#E3EEE7',
  wood: '#9A6B43',
  danger: '#A23B2A',
  mapLand: '#EFEAE1',
  fuzz: 'rgba(216,191,203,0.35)',
  fuzzEdge: '#4A2A3B',
} as const;

const dark: Record<keyof typeof light, string> = {
  bg: '#0A0A09',
  surface: '#1A1915',
  surfaceStrong: '#24221D',
  ink: '#F2EEE6',
  muted: '#A8A296',
  line: '#2C2A25',
  lineStrong: '#3A3832',
  accent: '#8CC2A2',
  primary: '#2E6B4A',
  onPrimary: '#FFFFFF',
  chip: '#3A2731',
  onChip: '#E7C9D7',
  chipSoft: '#21181D',
  greenSoft: '#14261B',
  wood: '#8A5E3B',
  danger: '#E8846F',
  mapLand: '#12120F',
  fuzz: 'rgba(231,201,215,0.14)',
  fuzzEdge: '#E7C9D7',
};

export type Colors = typeof dark;

export const fonts = {
  regular: 'Jost_400Regular',
  medium: 'Jost_500Medium',
  semibold: 'Jost_600SemiBold',
  mono: 'IBMPlexMono_500Medium',
  monoBold: 'IBMPlexMono_600SemiBold',
} as const;

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28 } as const;
export const radius = { sm: 10, md: 14, lg: 18, pill: 999 } as const;

export function useColors(): Colors {
  return useColorScheme() === 'dark' ? dark : light;
}
