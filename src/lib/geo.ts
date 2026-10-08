export type LatLng = { lat: number; lng: number };

/** Private jams show a circle with a one-mile radius instead of a pin. */
export const FUZZY_RADIUS_M = 1609;

const EARTH_RADIUS_M = 6_371_000;

/** Great-circle distance in meters. */
export function distanceM(a: LatLng, b: LatLng): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}

/** The point `meters` away from `from` in the direction `bearing` (radians, 0 = north). */
export function offset(from: LatLng, meters: number, bearing: number): LatLng {
  const dLat = (meters * Math.cos(bearing)) / EARTH_RADIUS_M;
  const dLng = (meters * Math.sin(bearing)) / (EARTH_RADIUS_M * Math.cos((from.lat * Math.PI) / 180));
  return { lat: from.lat + (dLat * 180) / Math.PI, lng: from.lng + (dLng * 180) / Math.PI };
}

/**
 * Picks the center of the circle shown for a private jam. The center is moved
 * 20–70% of the radius away from the real spot in a random direction, so the
 * real spot is always inside the circle but never at its middle.
 */
export function fuzzyCenter(real: LatLng, random: () => number = Math.random): LatLng {
  const meters = FUZZY_RADIUS_M * (0.2 + 0.5 * random());
  return offset(real, meters, random() * 2 * Math.PI);
}
