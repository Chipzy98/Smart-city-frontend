"use client";

import { useEffect, useRef, useCallback } from "react";

export type LatLng = { lat: number; lng: number };

export type TrafficPoint = {
  lat: number;
  lng: number;
  congestionLevel: number;
};

type Props = {
  trafficPoints?: TrafficPoint[];
  onLocationPick?: (latlng: LatLng) => void;
  pickedLocation?: LatLng | null;
  height?: string;
};

const DEFAULT_CENTER: [number, number] = [6.9271, 79.8612];

export default function TrafficMap({
  trafficPoints = [],
  onLocationPick,
  pickedLocation,
  height = "400px",
}: Props) {
  const containerRef  = useRef<HTMLDivElement>(null);
  const mapRef        = useRef<L.Map | null>(null);
  const markerRef     = useRef<L.CircleMarker | null>(null);
  const circlesRef    = useRef<L.CircleMarker[]>([]);
  const initializedRef = useRef(false);   // ← prevents double-init

  // ── Init map once ──────────────────────────────────────────────────────
  const initMap = useCallback(() => {
    if (initializedRef.current) return;
    if (!containerRef.current) return;

    import("leaflet").then((L) => {
      // Guard again — React StrictMode double-fires effects
      if (initializedRef.current) return;
      if (!containerRef.current) return;

      initializedRef.current = true;

      // @ts-expect-error _getIconUrl
      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl:       "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl:     "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      const map = L.map(containerRef.current, {
        center:   DEFAULT_CENTER,
        zoom:     13,
        zoomControl: true,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      if (onLocationPick) {
        map.on("click", (e: L.LeafletMouseEvent) => {
          onLocationPick({ lat: e.latlng.lat, lng: e.latlng.lng });
        });
      }

      mapRef.current = map;
    });
  }, [onLocationPick]);

  useEffect(() => {
    initMap();

    return () => {
      // Cleanup on unmount
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        initializedRef.current = false;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Update heatmap circles ─────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    import("leaflet").then((L) => {
      circlesRef.current.forEach((c) => c.remove());
      circlesRef.current = [];

      trafficPoints.forEach((p) => {
        const color =
          p.congestionLevel >= 75 ? "#ef4444" :
          p.congestionLevel >= 40 ? "#f59e0b" : "#22c55e";

        const circle = L.circleMarker([p.lat, p.lng], {
          radius:      Math.max(8, p.congestionLevel / 8),
          fillColor:   color,
          color,
          weight:      1,
          opacity:     0.9,
          fillOpacity: 0.5,
        })
          .bindPopup(
            `<b>Congestion:</b> ${p.congestionLevel.toFixed(0)}%<br/>` +
            `${p.lat.toFixed(5)}, ${p.lng.toFixed(5)}`
          )
          .addTo(map);

        circlesRef.current.push(circle);
      });
    });
  }, [trafficPoints]);

  // ── Update picked marker ───────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    import("leaflet").then((L) => {
      if (markerRef.current) {
        markerRef.current.remove();
        markerRef.current = null;
      }
      if (!pickedLocation) return;

      markerRef.current = L.circleMarker(
        [pickedLocation.lat, pickedLocation.lng],
        { radius: 12, fillColor: "#2563eb", color: "#fff", weight: 3, fillOpacity: 1 }
      )
        .bindPopup(`📍 ${pickedLocation.lat.toFixed(5)}, ${pickedLocation.lng.toFixed(5)}`)
        .addTo(map);

      map.panTo([pickedLocation.lat, pickedLocation.lng]);
    });
  }, [pickedLocation]);

  return (
    <>
      <link
        rel="stylesheet"
        href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
        crossOrigin=""
      />
      <div
        ref={containerRef}
        style={{ height, width: "100%" }}
        className="z-0 overflow-hidden rounded-3xl shadow-lg"
      />
    </>
  );
}