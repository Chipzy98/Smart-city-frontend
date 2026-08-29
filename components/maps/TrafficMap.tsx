"use client";

import { useEffect, useRef, useCallback } from "react";

export type LatLng        = { lat: number; lng: number };
export type TrafficPoint  = { lat: number; lng: number; congestionLevel: number };
export type RouteWaypoint = { lat: number; lng: number };

// Extended point with TomTom speed data
export type RealtimePoint = {
  locationName:     string;
  latitude:         number;
  longitude:        number;
  currentSpeedKmh:  number;
  freeFlowSpeedKmh: number;
  congestionLevel:  number;
  congestionStatus: string;
  confidence:       number;
};

export type RouteOption = {
  routeName:        string;
  roadNames:        string;
  distanceKm:       number;
  estimatedMinutes: number;
  congestionLevel:  number;
  congestionStatus: string;
  riskScore:        number;
  reason:           string;
  isRecommended:    boolean;
  waypoints:        RouteWaypoint[];
};

type Props = {
  trafficPoints?:   TrafficPoint[];
  realtimePoints?:  RealtimePoint[];   // ← TomTom live data
  onLocationPick?:  (latlng: LatLng) => void;
  selectionMode?:   "origin" | "destination" | null;
  pickedLocation?:  LatLng | null;
  originLocation?:  LatLng | null;
  destLocation?:    LatLng | null;
  routes?:          RouteOption[];
  selectedRoute?:   number | null;
  onRouteSelect?:   (idx: number) => void;
  height?:          string;
};

function routeColor(congestion: number, selected: boolean): string {
  if (selected)          return "#6366f1";
  if (congestion >= 75)  return "#ef4444";
  if (congestion >= 40)  return "#f59e0b";
  return "#22c55e";
}

function speedColor(congestion: number): string {
  if (congestion >= 75) return "#ef4444";
  if (congestion >= 40) return "#f59e0b";
  return "#22c55e";
}

const SL_CENTER: [number, number] = [7.8731, 80.7718];

export default function TrafficMap({
  trafficPoints  = [],
  realtimePoints = [],
  onLocationPick,
  selectionMode,
  pickedLocation,
  originLocation,
  destLocation,
  routes         = [],
  selectedRoute  = null,
  onRouteSelect,
  height = "400px",
}: Props) {
  const containerRef   = useRef<HTMLDivElement>(null);
  const mapRef         = useRef<L.Map | null>(null);
  const initializedRef = useRef(false);

  const pickedRef      = useRef<L.CircleMarker | null>(null);
  const originDotRef   = useRef<L.CircleMarker | null>(null);
  const originLblRef   = useRef<L.Marker | null>(null);
  const destDotRef     = useRef<L.CircleMarker | null>(null);
  const destLblRef     = useRef<L.Marker | null>(null);
  const routeLinesRef  = useRef<L.Polyline[]>([]);
  const circlesRef     = useRef<L.CircleMarker[]>([]);
  const realtimeRef    = useRef<(L.CircleMarker | L.Marker)[]>([]);

  // ── Init ──────────────────────────────────────────────────────────────
  const initMap = useCallback(() => {
    if (initializedRef.current || !containerRef.current) return;
    import("leaflet").then((L) => {
      if (initializedRef.current || !containerRef.current) return;
      initializedRef.current = true;
      // @ts-expect-error _getIconUrl
      delete L.Icon.Default.prototype._getIconUrl;

      const map = L.map(containerRef.current, { center: SL_CENTER, zoom: 8, zoomControl: true });
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      if (onLocationPick) {
        map.on("click", (e: L.LeafletMouseEvent) =>
          onLocationPick({ lat: e.latlng.lat, lng: e.latlng.lng })
        );
      }
      mapRef.current = map;
    });
  }, [onLocationPick]);

  useEffect(() => {
    initMap();
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        initializedRef.current = false;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Cursor ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current) return;
    containerRef.current.style.cursor = selectionMode ? "crosshair" : "grab";
  }, [selectionMode]);

  // ── DB traffic circles (historical) ───────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    import("leaflet").then((L) => {
      circlesRef.current.forEach((c) => c.remove());
      circlesRef.current = [];
      trafficPoints.forEach((p) => {
        const color = speedColor(p.congestionLevel);
        circlesRef.current.push(
          L.circleMarker([p.lat, p.lng], {
            radius: Math.max(7, p.congestionLevel / 9),
            fillColor: color, color, weight: 1, opacity: 0.7, fillOpacity: 0.35,
          }).bindPopup(`<b>Historical Congestion:</b> ${p.congestionLevel.toFixed(0)}%`).addTo(map)
        );
      });
    });
  }, [trafficPoints]);

  // ── TomTom real-time circles (live) ───────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    import("leaflet").then((L) => {
      realtimeRef.current.forEach((l) => l.remove());
      realtimeRef.current = [];

      realtimePoints.forEach((p) => {
        const color  = speedColor(p.congestionLevel);
        const radius = Math.max(14, 30 - p.congestionLevel / 5);

        // Outer glow
        const glow = L.circleMarker([p.latitude, p.longitude], {
          radius:      radius + 6,
          fillColor:   color,
          color:       color,
          weight:      1,
          opacity:     0.2,
          fillOpacity: 0.15,
        }).addTo(map);

        // Main circle with speed label
        const circle = L.circleMarker([p.latitude, p.longitude], {
          radius,
          fillColor:   color,
          color:       "#fff",
          weight:      2.5,
          opacity:     1,
          fillOpacity: 0.85,
        }).bindPopup(`
          <div style="min-width:180px;padding:6px">
            <b style="font-size:13px;color:${color}">🚗 ${p.locationName}</b>
            <hr style="margin:5px 0"/>
            <table style="font-size:12px;width:100%">
              <tr><td>⚡ Current Speed</td><td><b>${p.currentSpeedKmh} km/h</b></td></tr>
              <tr><td>🏎️ Free Flow</td><td><b>${p.freeFlowSpeedKmh} km/h</b></td></tr>
              <tr><td>🚦 Congestion</td><td><b style="color:${color}">${p.congestionLevel.toFixed(0)}%</b></td></tr>
              <tr><td>📊 Status</td><td><b>${p.congestionStatus}</b></td></tr>
              <tr><td>🎯 Confidence</td><td><b>${(p.confidence * 100).toFixed(0)}%</b></td></tr>
            </table>
            <p style="font-size:10px;color:#888;margin-top:5px">Live data from TomTom</p>
          </div>
        `).addTo(map);

        // Speed number label on circle
        const label = L.marker([p.latitude, p.longitude], {
          icon: L.divIcon({
            html: `<div style="
              color:#fff;font-weight:900;font-size:10px;
              text-align:center;line-height:1.1;
              pointer-events:none;
              text-shadow:0 1px 2px rgba(0,0,0,0.5);">
              ${p.currentSpeedKmh.toFixed(0)}<br/>
              <span style="font-size:8px">km/h</span>
            </div>`,
            iconSize:   [40, 30],
            iconAnchor: [20, 15],
            className:  "",
          }),
          interactive: false,
        }).addTo(map);

        realtimeRef.current.push(glow, circle, label);
      });
    });
  }, [realtimePoints]);

  // ── Picked pin ────────────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    import("leaflet").then((L) => {
      pickedRef.current?.remove();
      pickedRef.current = null;
      if (!pickedLocation) return;
      pickedRef.current = L.circleMarker(
        [pickedLocation.lat, pickedLocation.lng],
        { radius: 12, fillColor: "#2563eb", color: "#fff", weight: 3, fillOpacity: 1 }
      ).bindPopup(`📍 ${pickedLocation.lat.toFixed(5)}, ${pickedLocation.lng.toFixed(5)}`).addTo(map);
      map.panTo([pickedLocation.lat, pickedLocation.lng]);
    });
  }, [pickedLocation]);

  // ── Origin + Destination pins ──────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    import("leaflet").then((L) => {
      originDotRef.current?.remove(); originLblRef.current?.remove();
      destDotRef.current?.remove();   destLblRef.current?.remove();
      originDotRef.current = null; originLblRef.current = null;
      destDotRef.current   = null; destLblRef.current   = null;

      const pin = (letter: string, color: string) =>
        L.divIcon({
          html: `<div style="background:${color};color:#fff;font-weight:900;font-size:13px;
            width:30px;height:30px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);
            border:3px solid #fff;box-shadow:0 3px 10px rgba(0,0,0,0.3);
            display:flex;align-items:center;justify-content:center;">
            <span style="transform:rotate(45deg)">${letter}</span></div>`,
          iconSize: [30, 36], iconAnchor: [15, 30], className: "",
        });

      if (originLocation) {
        originDotRef.current = L.circleMarker(
          [originLocation.lat, originLocation.lng],
          { radius: 20, fillColor: "#2563eb", color: "#2563eb", weight: 1, fillOpacity: 0.12 }
        ).addTo(map);
        originLblRef.current = L.marker(
          [originLocation.lat, originLocation.lng],
          { icon: pin("A", "#2563eb"), interactive: false }
        ).bindPopup(`<b style="color:#2563eb">📍 Starting Point</b><br/><small>${originLocation.lat.toFixed(5)}, ${originLocation.lng.toFixed(5)}</small>`)
         .addTo(map);
      }

      if (destLocation) {
        destDotRef.current = L.circleMarker(
          [destLocation.lat, destLocation.lng],
          { radius: 20, fillColor: "#16a34a", color: "#16a34a", weight: 1, fillOpacity: 0.12 }
        ).addTo(map);
        destLblRef.current = L.marker(
          [destLocation.lat, destLocation.lng],
          { icon: pin("B", "#16a34a"), interactive: false }
        ).bindPopup(`<b style="color:#16a34a">🏁 Destination</b><br/><small>${destLocation.lat.toFixed(5)}, ${destLocation.lng.toFixed(5)}</small>`)
         .addTo(map);
      }

      if (originLocation && destLocation && routes.length === 0) {
        map.fitBounds(
          L.latLngBounds(
            [originLocation.lat, originLocation.lng],
            [destLocation.lat, destLocation.lng]
          ),
          { padding: [70, 70] }
        );
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [originLocation, destLocation]);

  // ── Route lines ───────────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    import("leaflet").then((L) => {
      routeLinesRef.current.forEach((l) => l.remove());
      routeLinesRef.current = [];
      if (routes.length === 0) return;

      const allBounds: [number, number][] = [];
      routes.forEach((route, idx) => {
        if (route.waypoints.length < 2) return;
        const isSelected = idx === selectedRoute;
        const color      = routeColor(route.congestionLevel, isSelected);
        const latlngs    = route.waypoints.map((w): [number, number] => [w.lat, w.lng]);
        latlngs.forEach((p) => allBounds.push(p));

        const halo = L.polyline(latlngs, { color: "#fff", weight: isSelected ? 10 : 7, opacity: 0.6 }).addTo(map);
        const line = L.polyline(latlngs, {
          color, weight: isSelected ? 7 : 4, opacity: isSelected ? 1 : 0.75,
          dashArray: isSelected ? undefined : "10 6",
        }).bindPopup(`
          <div style="min-width:190px;padding:6px">
            <b>${route.isRecommended ? "⭐ " : ""}${route.routeName}</b><br/>
            <small style="color:#666">${route.roadNames}</small><br/>
            <hr style="margin:5px 0"/>
            <div style="font-size:12px">
              📏 ${route.distanceKm} km &nbsp;|&nbsp;
              ⏱️ ${Math.floor(route.estimatedMinutes / 60) > 0
                ? `${Math.floor(route.estimatedMinutes / 60)}h ${route.estimatedMinutes % 60}m`
                : `${route.estimatedMinutes}m`}<br/>
              🚦 <b style="color:${color}">${route.congestionStatus}</b>
            </div>
            <p style="font-size:11px;color:#555;margin-top:5px">${route.reason}</p>
            ${onRouteSelect ? `<button onclick="window.__selectRoute(${idx})"
              style="margin-top:7px;width:100%;background:${color};color:#fff;
              border:none;border-radius:8px;padding:6px;font-weight:bold;cursor:pointer;font-size:12px;">
              Select Route</button>` : ""}
          </div>
        `).addTo(map);

        line.on("click", () => onRouteSelect?.(idx));
        halo.on("click", () => onRouteSelect?.(idx));
        routeLinesRef.current.push(halo, line);
      });

      if (onRouteSelect)
        (window as unknown as Record<string, unknown>).__selectRoute = onRouteSelect;
      if (allBounds.length > 0)
        map.fitBounds(L.latLngBounds(allBounds), { padding: [60, 60] });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routes, selectedRoute]);

  return (
    <>
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" crossOrigin="" />
      <div ref={containerRef} style={{ height, width: "100%" }} className="z-0 overflow-hidden rounded-3xl shadow-lg" />
    </>
  );
}