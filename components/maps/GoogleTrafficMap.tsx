"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  Loader2, RefreshCw, Wifi, WifiOff,
  Navigation, MapPin, X, Route,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type RealtimePoint = {
  locationName:     string;
  latitude:         number;
  longitude:        number;
  currentSpeedKmh:  number;
  freeFlowSpeedKmh: number;
  congestionLevel:  number;
  congestionStatus: string;
};

type LngLat   = { lng: number; lat: number };
type RouteInfo = { distanceKm: number; durationMin: number; geometry: GeoJSON.LineString };

interface Props { height?: string; }

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const TOMTOM    = process.env.NEXT_PUBLIC_TOMTOM_TOKEN ?? "";
const SL_CENTER: [number, number] = [80.7718, 7.8731];

// OpenFreeMap Liberty — Google Maps-like style, 100% free, no token needed
const MAP_STYLE = "https://tiles.openfreemap.org/styles/liberty";

const ML_VERSION = "4.7.1";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function congestionColor(level: number) {
  if (level >= 75) return "#ef4444";
  if (level >= 40) return "#f59e0b";
  return "#22c55e";
}
function congestionLabel(level: number) {
  if (level >= 75) return "Heavy";
  if (level >= 40) return "Moderate";
  return "Light";
}

// ─────────────────────────────────────────────────────────────────────────────
// MapLibre singleton loader
// State on `window` so Next.js HMR reloads don't reset it.
// ─────────────────────────────────────────────────────────────────────────────

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    maplibregl: any;
    __mlCbs: (() => void)[];
  }
}

function ensureMapLibre(cb: () => void) {
  if (typeof window === "undefined") return;

  if (window.maplibregl) { cb(); return; }

  if (!window.__mlCbs) window.__mlCbs = [];
  window.__mlCbs.push(cb);

  if (document.querySelector("script[data-maplibre]")) return;

  if (!document.querySelector("link[data-maplibre-css]")) {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.setAttribute("data-maplibre-css", "1");
    link.href = `https://unpkg.com/maplibre-gl@${ML_VERSION}/dist/maplibre-gl.css`;
    document.head.appendChild(link);
  }

  const s = document.createElement("script");
  s.setAttribute("data-maplibre", "1");
  s.src = `https://unpkg.com/maplibre-gl@${ML_VERSION}/dist/maplibre-gl.js`;
  s.onload = () => {
    (window.__mlCbs ?? []).forEach((f) => f());
    window.__mlCbs = [];
  };
  document.head.appendChild(s);
}

// ─────────────────────────────────────────────────────────────────────────────
// Routing — OSRM (free, no key)
// ─────────────────────────────────────────────────────────────────────────────

async function getRoute(origin: LngLat, dest: LngLat): Promise<RouteInfo | null> {
  try {
    const url =
      `https://router.project-osrm.org/route/v1/driving/` +
      `${origin.lng},${origin.lat};${dest.lng},${dest.lat}` +
      `?overview=full&geometries=geojson`;
    const res  = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.code !== "Ok" || !data.routes?.length) return null;
    const r = data.routes[0];
    return {
      distanceKm:  Math.round(r.distance / 100) / 10,
      durationMin: Math.round(r.duration / 60),
      geometry:    r.geometry as GeoJSON.LineString,
    };
  } catch { return null; }
}

// ─────────────────────────────────────────────────────────────────────────────
// Geocoding — Nominatim (free, no key)
// ─────────────────────────────────────────────────────────────────────────────

async function geocode(query: string): Promise<LngLat | null> {
  try {
    const url =
      `https://nominatim.openstreetmap.org/search` +
      `?q=${encodeURIComponent(query)}&countrycodes=lk&limit=1&format=json`;
    const res  = await fetch(url, {
      headers: { "Accept-Language": "en" },
      signal:  AbortSignal.timeout(8_000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.length) return null;
    return { lng: parseFloat(data[0].lon), lat: parseFloat(data[0].lat) };
  } catch { return null; }
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export default function GoogleTrafficMap({ height = "560px" }: Props) {
  const containerRef    = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef          = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markersRef      = useRef<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const originMarkerRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const destMarkerRef   = useRef<any>(null);
  const mountedRef      = useRef(true);

  const [mapReady,     setMapReady]     = useState(false);
  const [mapError,     setMapError]     = useState("");
  const [points,       setPoints]       = useState<RealtimePoint[]>([]);
  const [loading,      setLoading]      = useState(false);
  const [fetchError,   setFetchError]   = useState("");
  const [lastFetch,    setLastFetch]    = useState<Date | null>(null);
  const [autoRefresh,  setAutoRefresh]  = useState(false);
  const [selected,     setSelected]     = useState<RealtimePoint | null>(null);
  const [trafficOn,    setTrafficOn]    = useState(true);
  const [showPanel,    setShowPanel]    = useState(true);
  const [originInput,  setOriginInput]  = useState("");
  const [destInput,    setDestInput]    = useState("");
  const [origin,       setOrigin]       = useState<LngLat | null>(null);
  const [dest,         setDest]         = useState<LngLat | null>(null);
  const [routeInfo,    setRouteInfo]    = useState<RouteInfo | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeError,   setRouteError]   = useState("");
  const [pickMode,     setPickMode]     = useState<"origin" | "dest" | null>(null);

  // ── Map init ───────────────────────────────────────────────────────────────
  useEffect(() => {
    mountedRef.current = true;

    ensureMapLibre(() => {
      if (!mountedRef.current || !containerRef.current || mapRef.current) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const maplibregl = (window as any).maplibregl;

      let map;
      try {
        map = new maplibregl.Map({
          container: containerRef.current,
          style:     MAP_STYLE,
          center:    SL_CENTER,
          zoom:      7.5,
        });
      } catch (err) {
        setMapError(`Map failed to load: ${err instanceof Error ? err.message : String(err)}`);
        return;
      }

      mapRef.current = map;

      map.on("error", (e: { error?: Error }) => {
        if (e?.error?.message) console.warn("[MapLibre]", e.error.message);
      });

      map.on("load", () => {
        if (!mountedRef.current) return;

        // ── TomTom traffic layers (Google Maps style red/yellow/green) ────
        if (TOMTOM) {
          // Layer 1: absolute speed — main road colors
          map.addSource("tt-flow-abs", {
            type:     "raster",
            tiles:    [`https://api.tomtom.com/traffic/map/4/tile/flow/absolute/{z}/{x}/{y}.png?key=${TOMTOM}&thickness=10`],
            tileSize: 256,
          });
          map.addLayer({
            id: "tt-flow-abs-layer", type: "raster", source: "tt-flow-abs",
            paint: { "raster-opacity": 0.92, "raster-fade-duration": 0 },
          });

          // Layer 2: relative delay — deepens red in jammed areas
          map.addSource("tt-flow-rel", {
            type:     "raster",
            tiles:    [`https://api.tomtom.com/traffic/map/4/tile/flow/relative-delay/{z}/{x}/{y}.png?key=${TOMTOM}&thickness=10`],
            tileSize: 256,
          });
          map.addLayer({
            id: "tt-flow-rel-layer", type: "raster", source: "tt-flow-rel",
            paint: { "raster-opacity": 0.45, "raster-fade-duration": 0 },
          });

          // Layer 3: incidents (accidents, closures)
          map.addSource("tt-incidents", {
            type:     "raster",
            tiles:    [`https://api.tomtom.com/traffic/map/4/tile/incidents/s3/{z}/{x}/{y}.png?key=${TOMTOM}`],
            tileSize: 256,
          });
          map.addLayer({
            id: "tt-incidents-layer", type: "raster", source: "tt-incidents",
            paint: { "raster-opacity": 0.9, "raster-fade-duration": 0 },
          });
        }

        // ── Route source + layers ─────────────────────────────────────────
        map.addSource("route", {
          type: "geojson",
          data: { type: "Feature", geometry: { type: "LineString", coordinates: [] }, properties: {} },
        });
        map.addLayer({
          id: "route-casing", type: "line", source: "route",
          layout: { "line-join": "round", "line-cap": "round" },
          paint:  { "line-color": "#ffffff", "line-width": 10, "line-opacity": 0.85 },
        });
        map.addLayer({
          id: "route-line", type: "line", source: "route",
          layout: { "line-join": "round", "line-cap": "round" },
          paint:  { "line-color": "#2563eb", "line-width": 6, "line-opacity": 0.9 },
        });

        // Keep traffic layers below route
        if (TOMTOM && map.getLayer("route-casing")) {
          ["tt-flow-abs-layer", "tt-flow-rel-layer", "tt-incidents-layer"].forEach((id) => {
            if (map.getLayer(id)) map.moveLayer(id, "route-casing");
          });
        }

        setMapReady(true);
      });

      // Map click → pick origin / dest
      map.on("click", (e: { lngLat: { lng: number; lat: number } }) => {
        if (!mountedRef.current) return;
        const lngLat = { lng: e.lngLat.lng, lat: e.lngLat.lat };
        setPickMode((mode) => {
          if (mode === "origin") {
            setOrigin(lngLat);
            setOriginInput(`${lngLat.lat.toFixed(4)}, ${lngLat.lng.toFixed(4)}`);
            return "dest";
          }
          if (mode === "dest") {
            setDest(lngLat);
            setDestInput(`${lngLat.lat.toFixed(4)}, ${lngLat.lng.toFixed(4)}`);
            return null;
          }
          return mode;
        });
      });
    });

    return () => {
      mountedRef.current = false;
      markersRef.current.forEach((m) => { try { m.remove(); } catch { /**/ } });
      markersRef.current = [];
      try { originMarkerRef.current?.remove(); } catch { /**/ }
      try { destMarkerRef.current?.remove();   } catch { /**/ }
      originMarkerRef.current = null;
      destMarkerRef.current   = null;
      if (mapRef.current) { try { mapRef.current.remove(); } catch { /**/ } mapRef.current = null; }
    };
  }, []);

  // ── Traffic layer toggle ───────────────────────────────────────────────────
  useEffect(() => {
    if (!mapReady || !mapRef.current || !TOMTOM) return;
    const vis = trafficOn ? "visible" : "none";
    ["tt-flow-abs-layer", "tt-flow-rel-layer", "tt-incidents-layer"].forEach((id) => {
      if (mapRef.current.getLayer(id)) {
        mapRef.current.setLayoutProperty(id, "visibility", vis);
      }
    });
  }, [trafficOn, mapReady]);

  // ── Cursor ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current) return;
    mapRef.current.getCanvas().style.cursor = pickMode ? "crosshair" : "";
  }, [pickMode]);

  // ── A / B markers ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const maplibregl = (window as any).maplibregl;

    const makeEl = (letter: string, color: string) => {
      const el = document.createElement("div");
      el.style.cssText =
        `width:36px;height:36px;border-radius:50% 50% 50% 0;background:${color};` +
        `border:3px solid #fff;box-shadow:0 3px 10px rgba(0,0,0,0.3);` +
        `transform:rotate(-45deg);display:flex;align-items:center;justify-content:center;`;
      el.innerHTML = `<span style="transform:rotate(45deg);color:#fff;font-weight:900;font-size:13px">${letter}</span>`;
      return el;
    };

    try { originMarkerRef.current?.remove(); } catch { /**/ }
    if (origin) {
      originMarkerRef.current = new maplibregl.Marker({ element: makeEl("A", "#2563eb"), anchor: "bottom" })
        .setLngLat([origin.lng, origin.lat]).addTo(mapRef.current);
    }

    try { destMarkerRef.current?.remove(); } catch { /**/ }
    if (dest) {
      destMarkerRef.current = new maplibregl.Marker({ element: makeEl("B", "#16a34a"), anchor: "bottom" })
        .setLngLat([dest.lng, dest.lat]).addTo(mapRef.current);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [origin, dest, mapReady]);

  // ── Route drawing ──────────────────────────────────────────────────────────
  const drawRoute = useCallback(async () => {
    if (!origin || !dest || !mapReady || !mapRef.current) return;
    setRouteLoading(true); setRouteError("");

    const info = await getRoute(origin, dest);
    if (!mountedRef.current) return;
    setRouteLoading(false);

    if (!info) { setRouteError("Route not found. Try different locations."); return; }
    setRouteInfo(info);
    mapRef.current.getSource("route")?.setData({
      type: "Feature", geometry: info.geometry, properties: {},
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const maplibregl = (window as any).maplibregl;
    const coords = info.geometry.coordinates as [number, number][];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const bounds = coords.reduce((b: any, c) => b.extend(c), new maplibregl.LngLatBounds(coords[0], coords[0]));
    mapRef.current.fitBounds(bounds, { padding: 80, maxZoom: 14 });
  }, [origin, dest, mapReady]);

  useEffect(() => {
    if (!origin || !dest) return;
    const id = setTimeout(() => { drawRoute(); }, 0);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [origin, dest]);

  // ── Clear route ────────────────────────────────────────────────────────────
  const clearRoute = () => {
    setOrigin(null); setDest(null); setOriginInput(""); setDestInput("");
    setRouteInfo(null); setRouteError(""); setPickMode(null);
    try { originMarkerRef.current?.remove(); } catch { /**/ } originMarkerRef.current = null;
    try { destMarkerRef.current?.remove();   } catch { /**/ } destMarkerRef.current   = null;
    mapRef.current?.getSource("route")?.setData({
      type: "Feature", geometry: { type: "LineString", coordinates: [] }, properties: {},
    });
    mapRef.current?.flyTo({ center: SL_CENTER, zoom: 7.5 });
  };

  // ── Place search ───────────────────────────────────────────────────────────
  const handleSearch = async (type: "origin" | "dest") => {
    const q = type === "origin" ? originInput : destInput;
    if (!q.trim()) return;
    const lngLat = await geocode(q);
    if (!lngLat) { setRouteError(`"${q}" location not found.`); return; }
    if (type === "origin") { setOrigin(lngLat); mapRef.current?.flyTo({ center: [lngLat.lng, lngLat.lat], zoom: 11 }); }
    else                   { setDest(lngLat);   mapRef.current?.flyTo({ center: [lngLat.lng, lngLat.lat], zoom: 11 }); }
  };

  // ── TomTom data fetch ──────────────────────────────────────────────────────
  const fetchData = async () => {
    setLoading(true); setFetchError("");
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("token") ?? "" : "";
      const res   = await fetch("/api/smartcity/traffic/realtime", {
        headers: { Authorization: token ? `Bearer ${token}` : "" },
      });
      const json  = await res.json();
      const data: RealtimePoint[] = json?.data ? json.data : Array.isArray(json) ? json : [];
      if (data.length === 0) setFetchError("No traffic data. Backend running ද?");
      setPoints(data); setLastFetch(new Date());
    } catch { setFetchError("TomTom fetch failed. Backend running ද?"); }
    finally  { setLoading(false); }
  };

  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(fetchData, 60_000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRefresh]);

  // ── Traffic point markers ──────────────────────────────────────────────────
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const maplibregl = (window as any).maplibregl;

    markersRef.current.forEach((m) => { try { m.remove(); } catch { /**/ } });
    markersRef.current = [];

    points.forEach((p) => {
      const color = congestionColor(p.congestionLevel);
      const el    = document.createElement("div");
      el.style.cssText =
        `width:44px;height:44px;border-radius:50%;background:${color};` +
        `border:3px solid #fff;box-shadow:0 3px 10px rgba(0,0,0,0.25);` +
        `display:flex;align-items:center;justify-content:center;` +
        `flex-direction:column;color:#fff;font-size:11px;font-weight:800;` +
        `cursor:pointer;line-height:1.1;text-align:center;transition:transform .15s;`;
      el.innerHTML = `${p.currentSpeedKmh}<div style="font-size:8px;font-weight:600;opacity:.9">km/h</div>`;
      el.onmouseenter = () => { el.style.transform = "scale(1.15)"; };
      el.onmouseleave = () => { el.style.transform = "scale(1)"; };
      el.onclick = () => setSelected((prev) => prev?.locationName === p.locationName ? null : p);

      const popup = new maplibregl.Popup({ offset: 28 }).setHTML(`
        <div style="min-width:160px;font-family:sans-serif;padding:6px">
          <b style="color:${color};font-size:13px">🚗 ${p.locationName}</b>
          <hr style="margin:5px 0;border-color:#eee"/>
          <div style="font-size:12px;line-height:1.9">
            ⚡ Current: <b>${p.currentSpeedKmh} km/h</b><br/>
            🏎️ Free flow: <b>${p.freeFlowSpeedKmh} km/h</b><br/>
            🚦 <b style="color:${color}">${p.congestionStatus}</b>
          </div>
        </div>
      `);

      markersRef.current.push(
        new maplibregl.Marker({ element: el })
          .setLngLat([p.longitude, p.latitude])
          .setPopup(popup)
          .addTo(mapRef.current)
      );
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [points, mapReady]);

  const avgCongestion = points.length > 0
    ? Math.round(points.reduce((s, p) => s + p.congestionLevel, 0) / points.length)
    : null;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="relative w-full overflow-hidden rounded-3xl shadow-lg" style={{ height }}>
      <div ref={containerRef} className="h-full w-full" />

      {!mapReady && !mapError && (
        <div className="absolute inset-0 flex items-center justify-center rounded-3xl bg-slate-100">
          <div className="flex flex-col items-center gap-2">
            <Loader2 size={28} className="animate-spin text-blue-500" />
            <p className="text-sm font-semibold text-slate-400">Loading map…</p>
          </div>
        </div>
      )}

      {mapError && (
        <div className="absolute inset-0 flex items-center justify-center rounded-3xl bg-red-50 p-6">
          <p className="text-sm font-semibold text-red-600 text-center">⚠️ {mapError}</p>
        </div>
      )}

      {mapReady && (
        <>
          {/* TOP BAR */}
          <div className="absolute left-3 right-3 top-3 z-[1000] flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 rounded-2xl bg-white/90 px-3 py-2 shadow backdrop-blur-sm">
              <span className="text-sm font-bold text-slate-800">🗺️ Live Traffic Map</span>
              {lastFetch && <span className="text-xs text-slate-400">{lastFetch.toLocaleTimeString()}</span>}
            </div>
            <div className="ml-auto flex flex-wrap gap-2">
              {TOMTOM && (
                <button type="button" onClick={() => setTrafficOn((v) => !v)}
                  className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold shadow transition ${trafficOn ? "bg-red-500 text-white" : "bg-white/90 text-slate-600 hover:bg-white"}`}>
                  🚦 {trafficOn ? "Traffic ON" : "Traffic OFF"}
                </button>
              )}
              <button type="button" onClick={() => setShowPanel((v) => !v)}
                className="flex items-center gap-1.5 rounded-xl bg-white/90 px-3 py-2 text-xs font-bold text-slate-700 shadow hover:bg-white transition">
                <Route size={13} /> {showPanel ? "Hide" : "Route"}
              </button>
              <button type="button" onClick={() => setAutoRefresh((v) => !v)}
                className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold shadow transition ${autoRefresh ? "bg-green-600 text-white" : "bg-white/90 text-slate-600 hover:bg-white"}`}>
                {autoRefresh ? <Wifi size={13} /> : <WifiOff size={13} />}
                {autoRefresh ? "Auto ON" : "Auto OFF"}
              </button>
              <button type="button" onClick={fetchData} disabled={loading}
                className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-3 py-2 text-xs font-bold text-white shadow hover:bg-blue-700 disabled:opacity-60 transition">
                {loading ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
                {loading ? "Fetching…" : "Live Traffic"}
              </button>
            </div>
          </div>

          {/* ROUTE PANEL */}
          {showPanel && (
            <div className="absolute left-3 top-16 z-[1000] w-72 rounded-3xl border border-white/60 bg-white/95 p-4 shadow-2xl backdrop-blur-sm">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="flex items-center gap-2 font-bold text-slate-800 text-sm">
                  <Navigation size={15} className="text-blue-600" /> Route Planner
                </h3>
                {(origin || dest) && (
                  <button type="button" onClick={clearRoute}
                    className="rounded-xl bg-slate-100 px-2 py-1 text-[11px] font-bold text-slate-500 hover:bg-slate-200">Clear</button>
                )}
              </div>

              {pickMode && (
                <div className={`mb-3 rounded-2xl px-3 py-2 text-xs font-semibold ${pickMode === "origin" ? "bg-blue-50 text-blue-700" : "bg-green-50 text-green-700"}`}>
                  {pickMode === "origin" ? "🔵 Click map to set Start (A)" : "🟢 Click map to set End (B)"}
                </div>
              )}

              <div className="mb-2">
                <label className="mb-1 flex items-center gap-1.5 text-xs font-bold text-slate-600">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white">A</span>
                  Starting Point
                </label>
                <div className="flex gap-1">
                  <input type="text" value={originInput} onChange={(e) => setOriginInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch("origin")}
                    placeholder="Search or click map…"
                    className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-blue-400" />
                  <button type="button" onClick={() => handleSearch("origin")}
                    className="rounded-xl bg-blue-600 px-2.5 text-white hover:bg-blue-700"><MapPin size={13} /></button>
                  <button type="button" onClick={() => setPickMode((m) => m === "origin" ? null : "origin")}
                    className={`rounded-xl px-2.5 text-xs font-bold transition ${pickMode === "origin" ? "bg-blue-600 text-white" : "bg-blue-50 text-blue-700 hover:bg-blue-100"}`}>Pin</button>
                </div>
              </div>

              <div className="mb-3">
                <label className="mb-1 flex items-center gap-1.5 text-xs font-bold text-slate-600">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-green-600 text-[10px] font-bold text-white">B</span>
                  Destination
                </label>
                <div className="flex gap-1">
                  <input type="text" value={destInput} onChange={(e) => setDestInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch("dest")}
                    placeholder="Search or click map…"
                    className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-green-400" />
                  <button type="button" onClick={() => handleSearch("dest")}
                    className="rounded-xl bg-green-600 px-2.5 text-white hover:bg-green-700"><MapPin size={13} /></button>
                  <button type="button" onClick={() => setPickMode((m) => m === "dest" ? null : "dest")}
                    className={`rounded-xl px-2.5 text-xs font-bold transition ${pickMode === "dest" ? "bg-green-600 text-white" : "bg-green-50 text-green-700 hover:bg-green-100"}`}>Pin</button>
                </div>
              </div>

              {routeError && <p className="mb-2 rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-600">{routeError}</p>}

              {routeLoading && (
                <div className="flex items-center gap-2 rounded-2xl bg-blue-50 px-3 py-2.5 text-xs font-semibold text-blue-700">
                  <Loader2 size={13} className="animate-spin" /> Finding best route…
                </div>
              )}

              {routeInfo && !routeLoading && (
                <div className="rounded-2xl bg-gradient-to-br from-blue-50 to-green-50 p-3 border border-blue-100">
                  <div className="grid grid-cols-3 gap-2 mb-2">
                    <div className="rounded-xl bg-white p-2 text-center shadow-sm">
                      <p className="text-[10px] text-slate-400">Distance</p>
                      <p className="text-sm font-extrabold text-blue-700">{routeInfo.distanceKm} km</p>
                    </div>
                    <div className="rounded-xl bg-white p-2 text-center shadow-sm">
                      <p className="text-[10px] text-slate-400">Est. Time</p>
                      <p className="text-sm font-extrabold text-purple-700">
                        {routeInfo.durationMin >= 60
                          ? `${Math.floor(routeInfo.durationMin / 60)}h ${routeInfo.durationMin % 60}m`
                          : `${routeInfo.durationMin}m`}
                      </p>
                    </div>
                    <div className="rounded-xl bg-white p-2 text-center shadow-sm">
                      <p className="text-[10px] text-slate-400">Traffic</p>
                      <p className="text-sm font-extrabold" style={{ color: congestionColor(avgCongestion ?? 0) }}>
                        {avgCongestion !== null ? congestionLabel(avgCongestion) : "–"}
                      </p>
                    </div>
                  </div>
                  {avgCongestion !== null && (
                    <div className="h-1.5 overflow-hidden rounded-full bg-slate-200">
                      <div className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${avgCongestion}%`, background: congestionColor(avgCongestion) }} />
                    </div>
                  )}
                </div>
              )}

              {!origin && !dest && (
                <p className="text-center text-[11px] text-slate-400 mt-2">
                  Search locations above or click <b>Pin</b> then click on the map
                </p>
              )}
            </div>
          )}

          {/* SELECTED POINT CARD */}
          {selected && (
            <div className="absolute right-3 top-16 z-[1000] w-52 rounded-3xl border border-white/60 bg-white/95 p-4 shadow-xl backdrop-blur-sm">
              <button type="button" onClick={() => setSelected(null)}
                className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"><X size={14} /></button>
              <p className="text-xs text-slate-400 mb-1">TomTom Live</p>
              <p className="font-bold text-slate-800 text-sm mb-3">🚗 {selected.locationName}</p>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between"><span className="text-slate-500">⚡ Current</span><span className="font-bold">{selected.currentSpeedKmh} km/h</span></div>
                <div className="flex justify-between"><span className="text-slate-500">🏎️ Free flow</span><span className="font-bold">{selected.freeFlowSpeedKmh} km/h</span></div>
                <div className="flex justify-between">
                  <span className="text-slate-500">🚦 Status</span>
                  <span className="font-bold" style={{ color: congestionColor(selected.congestionLevel) }}>{selected.congestionStatus}</span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">
                  <div className="h-full rounded-full" style={{ width: `${selected.congestionLevel}%`, background: congestionColor(selected.congestionLevel) }} />
                </div>
                <p className="text-center text-[10px] text-slate-400">{selected.congestionLevel.toFixed(0)}% congestion</p>
              </div>
            </div>
          )}

          {/* BOTTOM STATS */}
          {points.length > 0 && (
            <div className="absolute bottom-3 left-3 right-3 z-[1000]">
              <div className="flex gap-2 overflow-x-auto pb-1">
                {points.map((p) => {
                  const color = congestionColor(p.congestionLevel);
                  const isSel = selected?.locationName === p.locationName;
                  return (
                    <button key={p.locationName} type="button"
                      onClick={() => setSelected((prev) => prev?.locationName === p.locationName ? null : p)}
                      className={`shrink-0 rounded-2xl border px-3 py-2 text-left shadow transition ${isSel ? "border-blue-400 bg-white scale-[1.03]" : "border-white/60 bg-white/90 hover:bg-white"}`}
                      style={{ minWidth: "110px" }}>
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="h-2 w-2 rounded-full shrink-0" style={{ background: color }} />
                        <p className="text-[11px] font-bold text-slate-700 truncate max-w-[80px]">{p.locationName}</p>
                      </div>
                      <p className="text-sm font-extrabold" style={{ color }}>
                        {p.currentSpeedKmh} <span className="text-[10px] font-semibold text-slate-400">km/h</span>
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* LEGEND */}
          <div className="absolute bottom-3 right-3 z-[1000] flex flex-col gap-1 rounded-2xl bg-white/90 px-3 py-2 shadow">
            <p className="text-[10px] font-bold text-slate-500 mb-0.5">Traffic</p>
            {[["#22c55e", "Low"], ["#f59e0b", "Moderate"], ["#ef4444", "High"]].map(([c, l]) => (
              <div key={l} className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: c }} />
                <span className="text-[10px] text-slate-600">{l}</span>
              </div>
            ))}
          </div>

          {/* PICK HINT */}
          {pickMode && (
            <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-[1000] rounded-2xl bg-slate-900/80 px-4 py-2 text-xs font-bold text-white shadow backdrop-blur-sm">
              {pickMode === "origin" ? "🔵 Click map → Start Point (A)" : "🟢 Click map → End Point (B)"}
            </div>
          )}

          {/* FETCH ERROR */}
          {fetchError && (
            <div className="absolute left-3 right-3 top-16 z-[1000] rounded-2xl border border-red-200 bg-red-50/95 px-4 py-2 text-xs font-semibold text-red-700 shadow">
              ⚠️ {fetchError}
            </div>
          )}
        </>
      )}
    </div>
  );
}