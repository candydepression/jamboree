// Phones: the map arrives with Mapbox (it needs Sido's Mapbox account and a native build).
// Until then the phone app shows the list, and the web build shows the Leaflet map.
import { View } from 'react-native';

import { radius, space, Text, useColors } from '@/ui';

import type { JamMapProps } from './types';

export function JamMap({ height = 220 }: JamMapProps) {
  const c = useColors();
  return (
    <View style={{ height, borderRadius: radius.md, backgroundColor: c.mapLand, alignItems: 'center', justifyContent: 'center', padding: space.lg }}>
      <Text variant="small" muted style={{ textAlign: 'center' }}>
        The map is on the web version for now. It comes to the phone app with Mapbox.
      </Text>
    </View>
  );
}
