import type { Bounds } from '@/lib/api';

export type MapPin = { id: string; lat: number; lng: number; label: string };

export type JamMapProps = {
  pins: MapPin[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  /** Called when the person pans or zooms, so the list can follow the map. */
  onBoundsChange?: (bounds: Bounds) => void;
  /** A single-jam map (the jam page) sits still and frames its circle. */
  still?: boolean;
  height?: number;
};

/** Seattle, roughly Ballard to Columbia City. */
export const SEATTLE = { lat: 47.62, lng: -122.33, zoom: 12 };

/** Pins sit up to 0.75 mi from the real spot; the circle is drawn at 1 mi so the spot is always inside. */
export const FUZZ_RADIUS_METERS = 1609;
