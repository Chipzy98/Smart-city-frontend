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

type LatLng   = { lat: number; lng: number };
type RouteInfo = { distanceKm: number; durationMin: number };

interface Props { height?: string; }

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const GOOGLE_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";
const TOMTOM     = process.env.NEXT_PUBLIC_TOMTOM_TOKEN ?? "";

const SL_CENTER = { lat: 7.8731, lng: 80.7718 };
const SL_ZOOM   = 8;

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
// Google Maps singleton loader
// State on `window` so Next.js HMR reloads don't reset it.
// ─────────────────────────────────────────────────────────────────────────────

declare global {
  interface Window {
    // `google` is already typed as `typeof google` by @types/google.maps.
    // Redeclaring it as `any` causes TS2717. Only declare our own additions.
    __gmCbs:    (() => void)[];
    __gmLoaded: boolean;
  }
}

function ensureGoogle(cb: () => void) {
  if (typeof window === "undefined") return;

  // Already loaded
  if (window.__gmLoaded && window.google?.maps) { cb(); return; }

  if (!window.__gmCbs) window.__gmCbs = [];
  window.__gmCbs.push(cb);

  // Script already injected — wait
  if (document.querySelector("script[data-google-maps]")) return;

  // Callback name Google will call when ready
  (window as unknown as Record<string, unknown>).__gmInit = () => {
    window.__gmLoaded = true;
    (window.__gmCbs ?? []).forEach((f) => f());
    window.__gmCbs = [];
  };

  const s = document.createElement("script");
  s.setAttribute("data-google-maps", "1");
  s.src =
    `https://maps.googleapis.com/maps/api/js` +
    `?key=${GOOGLE_KEY}` +
    `&libraries=places,geometry` +
    `&callback=__gmInit` +
    `&loading=async`;
  s.async = true;
  s.defer = true;
  document.head.appendChild(s);
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export default function GoogleTrafficMap({ height = "560px" }: Props) {
  const containerRef      = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef            = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const trafficLayerRef   = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const directionsRendRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const directionsServRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markersRef        = useRef<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const originMarkerRef   = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const destMarkerRef     = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const infoWindowRef     = useRef<any>(null);
  const mountedRef          = useRef(true);
  const originACRef         = useRef<HTMLInputElement>(null);
  const destACRef           = useRef<HTMLInputElement>(null);

  // GOOGLE_KEY is a build-time constant (process.env inlined by Next.js).
  // Deriving the initial error from it here means we never need to call
  // setMapError inside a useEffect, which satisfies react-hooks/set-state-in-effect.
  const [mapReady,  setMapReady]  = useState(false);
  const [mapError,  setMapError]  = useState<string>(
    () => GOOGLE_KEY ? "" : "NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is missing in .env.local"
  );
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
  const [origin,       setOrigin]       = useState<LatLng | null>(null);
  const [dest,         setDest]         = useState<LatLng | null>(null);
  const [routeInfo,    setRouteInfo]    = useState<RouteInfo | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeError,   setRouteError]   = useState("");
  const [pickMode,     setPickMode]     = useState<"origin" | "dest" | null>(null);

  // ── Map init ─────────────────────────────────────────────────────────────
  useEffect(() => {
    mountedRef.current = true;

    // mapError is already set in the useState initializer if key is missing.
    // Skip map init entirely when there's no key.
    if (!GOOGLE_KEY) return;

    ensureGoogle(() => {
      if (!mountedRef.current || !containerRef.current || mapRef.current) return;

      const G = window.google.maps;

      try {
        // ── Real Google Map ──────────────────────────────────────────────
        const map = new G.Map(containerRef.current, {
          center:            SL_CENTER,
          zoom:              SL_ZOOM,
          mapTypeId:         G.MapTypeId.ROADMAP,
          disableDefaultUI:  false,
          zoomControl:       true,
          mapTypeControl:    false,
          streetViewControl: false,
          fullscreenControl: false,
          styles: [
            // Subtle style — keeps road colors but reduces POI clutter
            { featureType: "poi",               elementType: "labels", stylers: [{ visibility: "off" }] },
            { featureType: "transit.station",   elementType: "labels", stylers: [{ visibility: "off" }] },
          ],
        });
        mapRef.current = map;

        // ── Google TrafficLayer — exact same as Google Maps traffic ──────
        const trafficLayer = new G.TrafficLayer();
        trafficLayer.setMap(map);
        trafficLayerRef.current = trafficLayer;

        // ── Directions ───────────────────────────────────────────────────
        directionsServRef.current = new G.DirectionsService();
        directionsRendRef.current = new G.DirectionsRenderer({
          map,
          suppressMarkers:      true,  // we use custom A/B markers
          polylineOptions: {
            strokeColor:   "#2563eb",
            strokeWeight:  6,
            strokeOpacity: 0.9,
          },
        });

        // ── Shared InfoWindow ────────────────────────────────────────────
        infoWindowRef.current = new G.InfoWindow();

        // ── Map click — pick origin / dest ───────────────────────────────
        // Use google.maps.event.addListener — avoids TS2339 on typed Map ref
        G.event.addListener(map, "click", (e: { latLng: { lat(): number; lng(): number } }) => {
          if (!mountedRef.current) return;
          const latlng = { lat: e.latLng.lat(), lng: e.latLng.lng() };
          setPickMode((mode) => {
            if (mode === "origin") {
              setOrigin(latlng);
              setOriginInput(`${latlng.lat.toFixed(5)}, ${latlng.lng.toFixed(5)}`);
              return "dest";
            }
            if (mode === "dest") {
              setDest(latlng);
              setDestInput(`${latlng.lat.toFixed(5)}, ${latlng.lng.toFixed(5)}`);
              return null;
            }
            return mode;
          });
        });

        setMapReady(true);
      } catch (err) {
        setMapError(`Map failed to load: ${err instanceof Error ? err.message : String(err)}`);
      }
    });

    return () => {
      mountedRef.current = false;
      // Google Maps doesn't need explicit destroy — just clear refs
      markersRef.current.forEach((m) => { try { m.setMap(null); } catch { /**/ } });
      markersRef.current = [];
      try { originMarkerRef.current?.setMap(null); } catch { /**/ }
      try { destMarkerRef.current?.setMap(null);   } catch { /**/ }
      originMarkerRef.current = null;
      destMarkerRef.current   = null;
      mapRef.current          = null;
    };
  }, []);

  // ── Places Autocomplete ───────────────────────────────────────────────────
  useEffect(() => {
    if (!mapReady) return;
    const G = window.google.maps.places;

    const setupAC = (
      input: HTMLInputElement | null,
      onPlace: (latlng: LatLng, addr: string) => void
    ) => {
      if (!input) return;
      const ac = new G.Autocomplete(input, { componentRestrictions: { country: "lk" } });
      ac.addListener("place_changed", () => {
        const place = ac.getPlace();
        if (!place?.geometry?.location) return;
        const latlng = { lat: place.geometry.location.lat(), lng: place.geometry.location.lng() };
        onPlace(latlng, place.formatted_address ?? input.value);
      });
    };

    setupAC(originACRef.current, (latlng, addr) => {
      setOrigin(latlng);
      setOriginInput(addr);
      mapRef.current?.panTo(latlng);
      mapRef.current?.setZoom(12);
    });

    setupAC(destACRef.current, (latlng, addr) => {
      setDest(latlng);
      setDestInput(addr);
      mapRef.current?.panTo(latlng);
      mapRef.current?.setZoom(12);
    });
  }, [mapReady]);

  // ── Traffic layer toggle ──────────────────────────────────────────────────
  useEffect(() => {
    if (!mapReady || !trafficLayerRef.current) return;
    trafficLayerRef.current.setMap(trafficOn ? mapRef.current : null);
  }, [trafficOn, mapReady]);

  // ── Cursor ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current) return;
    mapRef.current.setOptions({ draggableCursor: pickMode ? "crosshair" : "" });
  }, [pickMode]);

  // ── A/B custom markers ────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    const G = window.google.maps;

    const makePinSVG = (letter: string, color: string) =>
      `data:image/svg+xml;charset=utf-8,` + encodeURIComponent(`
        <svg xmlns="http://www.w3.org/2000/svg" width="36" height="44" viewBox="0 0 36 44">
          <path d="M18 0C8 0 0 8 0 18c0 12 18 26 18 26S36 30 36 18C36 8 28 0 18 0z" fill="${color}"/>
          <circle cx="18" cy="18" r="10" fill="white"/>
          <text x="18" y="23" text-anchor="middle" font-family="sans-serif" font-size="13" font-weight="900" fill="${color}">${letter}</text>
        </svg>`);

    try { originMarkerRef.current?.setMap(null); } catch { /**/ }
    if (origin) {
      originMarkerRef.current = new G.Marker({
        position: origin, map: mapRef.current,
        icon: makePinSVG("A", "#2563eb"),
        title: "Starting Point",
        zIndex: 100,
      });
    }

    try { destMarkerRef.current?.setMap(null); } catch { /**/ }
    if (dest) {
      destMarkerRef.current = new G.Marker({
        position: dest, map: mapRef.current,
        icon: makePinSVG("B", "#16a34a"),
        title: "Destination",
        zIndex: 100,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [origin, dest, mapReady]);

  // ── Route via Google Directions API ──────────────────────────────────────
  const drawRoute = useCallback(async () => {
    if (!origin || !dest || !mapReady) return;
    const G = window.google.maps;

    setRouteLoading(true);
    setRouteError("");

    if (!directionsServRef.current || !directionsRendRef.current) return;
    directionsServRef.current.route(
      {
        origin:      new G.LatLng(origin.lat, origin.lng),
        destination: new G.LatLng(dest.lat, dest.lng),
        travelMode:  G.TravelMode.DRIVING,
        drivingOptions: {
          departureTime: new Date(),
          trafficModel:  G.TrafficModel.BEST_GUESS,
        },
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (result: any, status: any) => {
        if (!mountedRef.current) return;
        setRouteLoading(false);

        if (status !== "OK") {
          setRouteError(`Route not found: ${status}`);
          return;
        }

        directionsRendRef.current?.setDirections(result);

        const leg = result.routes[0].legs[0];
        setRouteInfo({
          distanceKm: Math.round(leg.distance.value / 100) / 10,
          durationMin: Math.round(leg.duration_in_traffic
            ? leg.duration_in_traffic.value / 60
            : leg.duration.value / 60),
        });
      }
    );
  }, [origin, dest, mapReady]);

  useEffect(() => {
    if (!origin || !dest) return;
    const id = setTimeout(() => { drawRoute(); }, 0);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [origin, dest]);

  // ── Clear route ───────────────────────────────────────────────────────────
  const clearRoute = () => {
    setOrigin(null); setDest(null);
    setOriginInput(""); setDestInput("");
    setRouteInfo(null); setRouteError(""); setPickMode(null);
    try { originMarkerRef.current?.setMap(null); } catch { /**/ } originMarkerRef.current = null;
    try { destMarkerRef.current?.setMap(null);   } catch { /**/ } destMarkerRef.current   = null;
    directionsRendRef.current?.setDirections({ routes: [] });
    mapRef.current?.panTo(SL_CENTER);
    mapRef.current?.setZoom(SL_ZOOM);
  };

  // ── TomTom data fetch ─────────────────────────────────────────────────────
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

  // ── TomTom point markers on Google Map ───────────────────────────────────
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    const G = window.google.maps;

    markersRef.current.forEach((m) => { try { m.setMap(null); } catch { /**/ } });
    markersRef.current = [];

    points.forEach((p) => {
      const color = congestionColor(p.congestionLevel);

      // Custom circle marker via SVG
      const svgIcon = `data:image/svg+xml;charset=utf-8,` + encodeURIComponent(`
        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48">
          <circle cx="24" cy="24" r="21" fill="${color}" stroke="white" stroke-width="3"/>
          <text x="24" y="21" text-anchor="middle" font-family="sans-serif" font-size="13" font-weight="800" fill="white">${p.currentSpeedKmh}</text>
          <text x="24" y="33" text-anchor="middle" font-family="sans-serif" font-size="9" font-weight="600" fill="white" opacity="0.9">km/h</text>
        </svg>`);

      const marker = new G.Marker({
        position: { lat: p.latitude, lng: p.longitude },
        map:      mapRef.current,
        icon: svgIcon,
        title:  p.locationName,
        zIndex: 50,
      });

      G.event.addListener(marker, "click", () => {
        setSelected((prev) => prev?.locationName === p.locationName ? null : p);
        infoWindowRef.current?.setContent(`
          <div style="min-width:170px;font-family:sans-serif;padding:6px">
            <b style="color:${color};font-size:13px">🚗 ${p.locationName}</b>
            <hr style="margin:6px 0;border-color:#eee"/>
            <div style="font-size:12px;line-height:1.9">
              ⚡ Current: <b>${p.currentSpeedKmh} km/h</b><br/>
              🏎️ Free flow: <b>${p.freeFlowSpeedKmh} km/h</b><br/>
              🚦 <b style="color:${color}">${p.congestionStatus}</b>
            </div>
          </div>
        `);
        infoWindowRef.current?.open(mapRef.current, marker);
      });

      markersRef.current.push(marker);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [points, mapReady]);

  const avgCongestion = points.length > 0
    ? Math.round(points.reduce((s, p) => s + p.congestionLevel, 0) / points.length)
    : null;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="relative w-full overflow-hidden rounded-3xl shadow-lg" style={{ height }}>
      {/* Google Map container */}
      <div ref={containerRef} className="h-full w-full" />

      {/* Loading */}
      {!mapReady && !mapError && (
        <div className="absolute inset-0 flex items-center justify-center rounded-3xl bg-slate-100">
          <div className="flex flex-col items-center gap-2">
            <Loader2 size={28} className="animate-spin text-blue-500" />
            <p className="text-sm font-semibold text-slate-400">Loading Google Maps…</p>
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
              <button type="button" onClick={() => setTrafficOn((v) => !v)}
                className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold shadow transition ${trafficOn ? "bg-red-500 text-white" : "bg-white/90 text-slate-600 hover:bg-white"}`}>
                🚦 {trafficOn ? "Traffic ON" : "Traffic OFF"}
              </button>

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

              {/* Origin — Google Places Autocomplete */}
              <div className="mb-2">
                <label className="mb-1 flex items-center gap-1.5 text-xs font-bold text-slate-600">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white">A</span>
                  Starting Point
                </label>
                <div className="flex gap-1">
                  <input ref={originACRef} type="text" value={originInput}
                    onChange={(e) => setOriginInput(e.target.value)}
                    placeholder="Search or click map…"
                    className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-blue-400" />
                  <button type="button"
                    onClick={() => setPickMode((m) => m === "origin" ? null : "origin")}
                    className={`rounded-xl px-2.5 text-xs font-bold transition ${pickMode === "origin" ? "bg-blue-600 text-white" : "bg-blue-50 text-blue-700 hover:bg-blue-100"}`}>
                    <MapPin size={13} />
                  </button>
                </div>
              </div>

              {/* Destination — Google Places Autocomplete */}
              <div className="mb-3">
                <label className="mb-1 flex items-center gap-1.5 text-xs font-bold text-slate-600">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-green-600 text-[10px] font-bold text-white">B</span>
                  Destination
                </label>
                <div className="flex gap-1">
                  <input ref={destACRef} type="text" value={destInput}
                    onChange={(e) => setDestInput(e.target.value)}
                    placeholder="Search or click map…"
                    className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-green-400" />
                  <button type="button"
                    onClick={() => setPickMode((m) => m === "dest" ? null : "dest")}
                    className={`rounded-xl px-2.5 text-xs font-bold transition ${pickMode === "dest" ? "bg-green-600 text-white" : "bg-green-50 text-green-700 hover:bg-green-100"}`}>
                    <MapPin size={13} />
                  </button>
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
                  Search with Google Places above or click <b>📍</b> then click on map
                </p>
              )}
            </div>
          )}

          {/* SELECTED POINT CARD */}
          {selected && (
            <div className="absolute right-3 top-16 z-[1000] w-52 rounded-3xl border border-white/60 bg-white/95 p-4 shadow-xl backdrop-blur-sm">
              <button type="button" onClick={() => { setSelected(null); infoWindowRef.current?.close(); }}
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

          {/* BOTTOM STATS STRIP */}
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