"use client";

import "leaflet/dist/leaflet.css";
import Link from "next/link";
import { useEffect } from "react";
import { Circle, CircleMarker, MapContainer, Popup, TileLayer, useMap } from "react-leaflet";
import type { JamLocationView } from "@/lib/views";

export type MapJam = { id: string; title: string; when: string; where: JamLocationView };

const SEATTLE: [number, number] = [47.62, -122.33];

/** Zooms the map so every jam (and every privacy circle) is in view. */
function FitToJams({ jams }: { jams: MapJam[] }) {
  const map = useMap();
  useEffect(() => {
    if (jams.length < 2) return;
    const lats = jams.map((j) => j.where.lat);
    const lngs = jams.map((j) => j.where.lng);
    // Pad by about the one-mile circle so circles aren't cut off at the edge.
    const pad = 0.02;
    map.fitBounds([
      [Math.min(...lats) - pad, Math.min(...lngs) - pad],
      [Math.max(...lats) + pad, Math.max(...lngs) + pad],
    ]);
  }, [map, jams]);
  return null;
}

export default function JamMap({ jams, center, zoom = 12, className }: { jams: MapJam[]; center?: [number, number]; zoom?: number; className?: string }) {
  return (
    <MapContainer center={center ?? SEATTLE} zoom={zoom} scrollWheelZoom={false} className={className ?? "h-full w-full"}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {!center && <FitToJams jams={jams} />}
      {jams.map((jam) => {
        const popup = (
          <Popup>
            <Link href={`/jams/${jam.id}`} className="font-semibold">
              {jam.title}
            </Link>
            <br />
            {jam.when}
            {jam.where.kind === "area" && (
              <>
                <br />
                <span className="text-xs">Exact spot shared with guests</span>
              </>
            )}
          </Popup>
        );
        return jam.where.kind === "exact" ? (
          <CircleMarker key={jam.id} center={[jam.where.lat, jam.where.lng]} radius={9} pathOptions={{ color: "#b45309", fillColor: "#f59e0b", fillOpacity: 0.9, weight: 2 }}>
            {popup}
          </CircleMarker>
        ) : (
          <Circle key={jam.id} center={[jam.where.lat, jam.where.lng]} radius={jam.where.radiusM} pathOptions={{ color: "#7c3aed", fillColor: "#8b5cf6", fillOpacity: 0.15, weight: 1.5, dashArray: "4 4" }}>
            {popup}
          </Circle>
        );
      })}
    </MapContainer>
  );
}
