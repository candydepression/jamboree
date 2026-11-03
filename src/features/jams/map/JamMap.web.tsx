// Web map: Leaflet with free CARTO tiles until the Mapbox account exists.
import 'leaflet/dist/leaflet.css';

import { latLngBounds } from 'leaflet';
import { useEffect, useMemo } from 'react';
import { Circle, CircleMarker, MapContainer, TileLayer, Tooltip, useMap, useMapEvents } from 'react-leaflet';
import { useColorScheme, View } from 'react-native';

import { radius, useColors } from '@/ui';

import { FUZZ_RADIUS_METERS, SEATTLE, type JamMapProps } from './types';

const TILES = {
  light: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
  dark: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
};
const ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';

export function JamMap({ pins, selectedId, onSelect, onBoundsChange, still, height = 360 }: JamMapProps) {
  const c = useColors();
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const first = pins[0];
  const center = still && first ? { lat: first.lat, lng: first.lng } : SEATTLE;

  return (
    <View style={{ height, borderRadius: radius.md, overflow: 'hidden', backgroundColor: c.mapLand }}>
      <MapContainer
        center={[center.lat, center.lng]}
        zoom={still ? 13 : SEATTLE.zoom}
        style={{ height: '100%', width: '100%', background: c.mapLand }}
        scrollWheelZoom={!still}
        dragging={!still}
        zoomControl={!still}
        attributionControl>
        <TileLayer key={scheme} url={TILES[scheme]} attribution={ATTRIBUTION} />
        {onBoundsChange ? <BoundsWatcher onChange={onBoundsChange} /> : null}
        {still && first ? <FrameCircle lat={first.lat} lng={first.lng} /> : null}
        {pins.map((p) => {
          const on = p.id === selectedId;
          return (
            <Circle
              key={p.id}
              center={[p.lat, p.lng]}
              radius={FUZZ_RADIUS_METERS}
              pathOptions={{
                color: c.fuzzEdge,
                weight: on ? 2 : 1,
                dashArray: '4 4',
                fillColor: c.chip,
                fillOpacity: on ? 0.45 : 0.22,
              }}
              eventHandlers={onSelect ? { click: () => onSelect(p.id) } : undefined}
            />
          );
        })}
        {pins.map((p) => (
          <CircleMarker
            key={`${p.id}-dot`}
            center={[p.lat, p.lng]}
            radius={p.id === selectedId ? 9 : 7}
            pathOptions={{ color: '#FFFFFF', weight: 2, fillColor: c.primary, fillOpacity: 1 }}
            eventHandlers={onSelect ? { click: () => onSelect(p.id) } : undefined}>
            <Tooltip direction="top" offset={[0, -8]}>{p.label}</Tooltip>
          </CircleMarker>
        ))}
      </MapContainer>
    </View>
  );
}

function BoundsWatcher({ onChange }: { onChange: NonNullable<JamMapProps['onBoundsChange']> }) {
  const report = useMemo(
    () => (b: ReturnType<ReturnType<typeof useMap>['getBounds']>) =>
      onChange({ south: b.getSouth(), west: b.getWest(), north: b.getNorth(), east: b.getEast() }),
    [onChange],
  );
  const map = useMapEvents({ moveend: () => report(map.getBounds()) });
  useEffect(() => report(map.getBounds()), [map, report]);
  return null;
}

function FrameCircle({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    // Fit the whole 1-mile circle on screen.
    const d = FUZZ_RADIUS_METERS / 111_320;
    map.fitBounds(latLngBounds([lat - d, lng - d * 1.5], [lat + d, lng + d * 1.5]), { padding: [8, 8] });
  }, [map, lat, lng]);
  return null;
}
