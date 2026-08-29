"use client";

import { useEffect, useRef } from "react";

export type LatLng = { lat: number; lng: number };

export type TrafficPoint = {
  lat: number;
  lng: number;
  congestionLevel: number; // 0–100
};

type Props = {
  trafficPoints?: TrafficPoint[];
  onLocationPick?: (latlng: LatLng) => void;
  pickedLocation?: LatLng | null;
  height?: string;
};

// Colombo, Sri Lanka center
const DEFAULT_CENTER: [number, number] = [6.9271, 79.8612];

export default function TrafficMap({
  trafficPoints = [],
  onLocationPick,
  pickedLocation,
  height = "400px",
}: Props) {
  const mapRef       = useRef<HTMLDivElement>(null);
  const mapObjRef    = useRef<L.Map | null>(null);
  const markerRef    = useRef<L.CircleMarker | null>(null);
  const circlesRef   = useRef<L.CircleMarker[]>([]);

  // ── Init map once ──────────────────────────────────────────────────────
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!mapRef.current || mapObjRef.current) return;

    // Dynamically import Leaflet (SSR safe)
    import("leaflet").then((L) => {
      // Fix default icon paths broken by webpack
      // @ts-expect-error _getIconUrl
      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl:       "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl:     "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      const map = L.map(mapRef.current!, {
        center:          DEFAULT_CENTER,
        zoom:            13,
        zoomControl:     true,
        attributionControl: true,
      });

      // OpenStreetMap tiles — completely free
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      // Click handler
      if (onLocationPick) {
        map.on("click", (e: L.LeafletMouseEvent) => {
          onLocationPick({ lat: e.latlng.lat, lng: e.latlng.lng });
        });
      }

      mapObjRef.current = map;
    });

    return () => {
      mapObjRef.current?.remove();
      mapObjRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Update heatmap circles when traffic points change ─────────────────
  useEffect(() => {
    const map = mapObjRef.current;
    if (!map) return;

    import("leaflet").then((L) => {
      // Remove old circles
      circlesRef.current.forEach((c) => c.remove());
      circlesRef.current = [];

      trafficPoints.forEach((p) => {
        const color =
          p.congestionLevel >= 75 ? "#ef4444" :
          p.congestionLevel >= 40 ? "#f59e0b" : "#22c55e";

        const circle = L.circleMarker([p.lat, p.lng], {
          radius:      Math.max(8, p.congestionLevel / 8),
          fillColor:   color,
          color:       color,
          weight:      1,
          opacity:     0.9,
          fillOpacity: 0.5,
        })
          .bindPopup(
            `<b>Congestion:</b> ${p.congestionLevel.toFixed(0)}%<br/>` +
            `<b>Lat:</b> ${p.lat.toFixed(5)}<br/><b>Lng:</b> ${p.lng.toFixed(5)}`
          )
          .addTo(map);

        circlesRef.current.push(circle);
      });
    });
  }, [trafficPoints]);

  // ── Update picked location marker ──────────────────────────────────────
  useEffect(() => {
    const map = mapObjRef.current;
    if (!map) return;

    import("leaflet").then((L) => {
      if (markerRef.current) {
        markerRef.current.remove();
        markerRef.current = null;
      }

      if (!pickedLocation) return;

      const marker = L.circleMarker([pickedLocation.lat, pickedLocation.lng], {
        radius:      12,
        fillColor:   "#2563eb",
        color:       "#fff",
        weight:      3,
        opacity:     1,
        fillOpacity: 1,
      })
        .bindPopup(`<b>Selected Location</b><br/>${pickedLocation.lat.toFixed(5)}, ${pickedLocation.lng.toFixed(5)}`)
        .addTo(map);

      markerRef.current = marker;
      map.panTo([pickedLocation.lat, pickedLocation.lng]);
    });
  }, [pickedLocation]);

  return (
    <>
      {/* Leaflet CSS — load once */}
      <link
        rel="stylesheet"
        href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
        integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
        crossOrigin=""
      />
      <div
        ref={mapRef}
        style={{ height, width: "100%" }}
        className="z-0 overflow-hidden rounded-3xl shadow-lg"
      />
    </>
  );
}