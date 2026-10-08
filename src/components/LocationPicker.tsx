"use client";

import "leaflet/dist/leaflet.css";
import { useState } from "react";
import { CircleMarker, MapContainer, TileLayer, useMapEvents } from "react-leaflet";

function ClickToPlace({ onPlace }: { onPlace: (p: [number, number]) => void }) {
  useMapEvents({ click: (e) => onPlace([e.latlng.lat, e.latlng.lng]) });
  return null;
}

/** Tap the map to set the jam's real location; it's sent as hidden lat/lng fields. */
export default function LocationPicker() {
  const [point, setPoint] = useState<[number, number] | null>(null);
  return (
    <div className="space-y-1">
      <div className="h-64 overflow-hidden rounded-lg border border-stone-300">
        <MapContainer center={[47.62, -122.33]} zoom={12} className="h-full w-full">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <ClickToPlace onPlace={setPoint} />
          {point && <CircleMarker center={point} radius={9} pathOptions={{ color: "#b45309", fillColor: "#f59e0b", fillOpacity: 0.9 }} />}
        </MapContainer>
      </div>
      <input type="hidden" name="lat" value={point?.[0] ?? ""} />
      <input type="hidden" name="lng" value={point?.[1] ?? ""} />
      <p className="text-sm text-stone-600">
        {point ? "Spot placed. Tap again to move it." : "Tap the map where the jam happens."} For private jams, only guests you let in see this spot.
      </p>
    </div>
  );
}
