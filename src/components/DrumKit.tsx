// The welcome-screen drawing: a minimal drum kit under a half sun, with a plant, "1234" on the kick.
import { useColorScheme } from 'react-native';
import Svg, { Circle, Ellipse, Path, Rect, Text as SvgText } from 'react-native-svg';

const palettes = {
  light: {
    surface: '#F5F1EA', sun: '#D8BFCB', leaf: '#1F4A33', stand: '#5E5A52', brass: '#B8913F', wood: '#9A6B43',
    head: '#F5F1EA', kick: '#1B1A17', ring: '#3A3833', label: '#F5F1EA', labelInk: '#1B1A17',
  },
  dark: {
    surface: '#1A1915', sun: '#2E6B4A', leaf: '#8CC2A2', stand: '#6B675E', brass: '#C9A65A', wood: '#C08A5C',
    head: '#E9E2D3', kick: '#161613', ring: '#3A3832', label: '#E7C9D7', labelInk: '#2A1A22',
  },
};

export function DrumKit({ size = 260 }: { size?: number }) {
  const t = palettes[useColorScheme() === 'dark' ? 'dark' : 'light'];
  const leg = (d: string, w = 2.5) => (
    <Path d={d} fill="none" stroke={t.stand} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" />
  );
  return (
    <Svg width={size} height={size} viewBox="0 0 300 300" accessibilityLabel="A drum kit">
      <Rect x={20} y={170} width={260} height={110} rx={12} fill={t.surface} />
      <Path d="M40 170 A110 110 0 0 1 260 170 Z" fill={t.sun} />
      {/* plant */}
      <Path d="M60 36 C 74 60, 46 80, 62 108" fill="none" stroke={t.leaf} strokeWidth={3} strokeLinecap="round" />
      <Ellipse cx={72} cy={54} rx={13} ry={5} fill={t.leaf} transform="rotate(30 72 54)" />
      <Ellipse cx={50} cy={78} rx={13} ry={5} fill={t.leaf} transform="rotate(-25 50 78)" />
      <Ellipse cx={68} cy={96} rx={11} ry={4.5} fill={t.leaf} transform="rotate(20 68 96)" />
      {/* hi-hat */}
      {leg('M60 154 V268 M48 268 L60 254 L72 268')}
      <Ellipse cx={60} cy={150} rx={28} ry={4} fill={t.brass} />
      <Ellipse cx={60} cy={156} rx={28} ry={4} fill={t.brass} />
      {/* ride */}
      {leg('M240 112 V196')}
      <Ellipse cx={240} cy={108} rx={36} ry={5} fill={t.brass} transform="rotate(-8 240 108)" />
      {/* snare */}
      {leg('M88 226 V268 M78 268 L88 256 L98 268')}
      <Rect x={64} y={200} width={48} height={24} rx={4} fill={t.wood} />
      <Ellipse cx={88} cy={200} rx={24} ry={4} fill={t.head} />
      {/* floor tom */}
      <Rect x={214} y={192} width={52} height={72} rx={5} fill={t.wood} />
      <Ellipse cx={240} cy={192} rx={26} ry={5} fill={t.head} />
      {leg('M220 264 V272 M260 264 V272')}
      {/* rack tom */}
      <Rect x={126} y={112} width={48} height={34} rx={5} fill={t.wood} />
      <Ellipse cx={150} cy={112} rx={24} ry={4} fill={t.head} />
      {/* kick */}
      <Circle cx={150} cy={206} r={62} fill={t.kick} />
      <Circle cx={150} cy={206} r={54} fill="none" stroke={t.ring} strokeWidth={2} />
      <Circle cx={150} cy={206} r={20} fill={t.label} />
      <SvgText x={150} y={211} textAnchor="middle" fontFamily="IBMPlexMono_600SemiBold" fontSize={13} fill={t.labelInk}>
        1234
      </SvgText>
      {leg('M104 262 L96 274 M196 262 L204 274', 3)}
    </Svg>
  );
}
