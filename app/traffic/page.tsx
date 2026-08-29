"use client";

import { useEffect, useState, useCallback, type ChangeEvent } from "react";
import dynamic from "next/dynamic";
import {
  Car, CloudSun, CalendarDays, Clock, Gauge,
  Route, Loader2, MapPin, Navigation, History,
  AlertTriangle, CheckCircle2, Minus, RefreshCw,
  MousePointer2, Star, Wifi, WifiOff,
} from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import {
  getLiveTrafficFromApiAsync,
  getRealtimeTrafficFromApiAsync,
  predictTrafficFromApiAsync,
  analyseRouteFromApiAsync,
} from "../api/smartCityApi";
import type { LatLng, TrafficPoint, RealtimePoint, RouteOption } from "@/components/maps/TrafficMap";

const TrafficMap = dynamic(() => import("@/components/maps/TrafficMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[380px] items-center justify-center rounded-3xl bg-slate-100 text-sm text-slate-400">
      Loading map…
    </div>
  ),
});

// ── Types ──────────────────────────────────────────────────────────────────
type PageTab = "predict" | "route";

type TrafficRecord = {
  trafficDataId:   string;
  latitude:        number;
  longitude:       number;
  congestionLevel: number;
};

type PredictResult = {
  predictedCongestionLevel: number;
  status:     string;
  suggestion: string;
};

type RouteResult = {
  routes?:          RouteOption[];
  summary?:         string;
  routeTrafficId?:  string;
  originName:       string;
  destinationName:  string;
  distanceKm:       number;
  estimatedMinutes: number;
  congestionLevel:  number;
  congestionStatus: string;
  suggestion:       string;
  riskScore:        number;
};

type PredictForm = { hour: number; day: number; weather: number; vehicleCount: number };
type RouteForm   = { originName: string; destinationName: string; weather: number };

// ── Constants ──────────────────────────────────────────────────────────────
const weatherOptions = ["Clear ☀️", "Cloudy ⛅", "Rainy 🌧️", "Stormy ⛈️"];
const dayOptions     = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

const SRI_LANKA_CITIES = [
  { name: "Colombo",      lat: 6.9271, lng: 79.8612 },
  { name: "Kandy",        lat: 7.2906, lng: 80.6337 },
  { name: "Galle",        lat: 6.0535, lng: 80.2210 },
  { name: "Jaffna",       lat: 9.6615, lng: 80.0255 },
  { name: "Negombo",      lat: 7.2094, lng: 79.8358 },
  { name: "Matara",       lat: 5.9549, lng: 80.5550 },
  { name: "Trincomalee",  lat: 8.5874, lng: 81.2152 },
  { name: "Anuradhapura", lat: 8.3114, lng: 80.4037 },
  { name: "Batticaloa",   lat: 7.7170, lng: 81.6924 },
  { name: "Ratnapura",    lat: 6.6828, lng: 80.3992 },
  { name: "Colombo Fort", lat: 6.9344, lng: 79.8428 },
  { name: "Kurunegala",   lat: 7.4867, lng: 80.3647 },
  { name: "Badulla",      lat: 6.9934, lng: 81.0550 },
  { name: "Nuwara Eliya", lat: 6.9497, lng: 80.7891 },
  { name: "Hambantota",   lat: 6.1241, lng: 81.1185 },
];

// ── Helpers ────────────────────────────────────────────────────────────────
const congestionColor = (l: number) =>
  l >= 75 ? "text-red-600" : l >= 40 ? "text-yellow-600" : "text-green-600";
const congestionBg = (l: number) =>
  l >= 75 ? "bg-red-100 text-red-700" : l >= 40 ? "bg-yellow-100 text-yellow-700" : "bg-green-100 text-green-700";
const congestionBar = (l: number) =>
  l >= 75 ? "bg-red-500" : l >= 40 ? "bg-yellow-500" : "bg-green-500";
const riskIcon = (r: number) =>
  r >= 65 ? <AlertTriangle size={14} className="text-red-500" /> :
  r >= 35 ? <Minus         size={14} className="text-yellow-500" /> :
            <CheckCircle2  size={14} className="text-green-500" />;
const fmtTime = (m: number) =>
  Math.floor(m / 60) > 0 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`;

// ── Component ──────────────────────────────────────────────────────────────
export default function TrafficPage() {
  const [tab,     setTab]     = useState<PageTab>("predict");
  const [records, setRecords] = useState<TrafficRecord[]>([]);
  const [picked,  setPicked]  = useState<LatLng | null>(null);

  // ── Real-time TomTom state ─────────────────────────────────────────────
  const [realtimePoints,   setRealtimePoints]   = useState<RealtimePoint[]>([]);
  const [realtimeLoading,  setRealtimeLoading]  = useState(false);
  const [realtimeError,    setRealtimeError]     = useState("");
  const [realtimeLastFetch,setRealtimeLastFetch] = useState<Date | null>(null);
  const [autoRefresh,      setAutoRefresh]       = useState(false);

  // Predict
  const [predResult,  setPredResult]  = useState<PredictResult | null>(null);
  const [predLoading, setPredLoading] = useState(false);
  const [predForm,    setPredForm]    = useState<PredictForm>({
    hour: new Date().getHours(), day: new Date().getDay(), weather: 0, vehicleCount: 300,
  });

  // Route
  const [routeResult,   setRouteResult]   = useState<RouteResult | null>(null);
  const [routeLoading,  setRouteLoading]  = useState(false);
  const [routeForm,     setRouteForm]     = useState<RouteForm>({ originName: "", destinationName: "", weather: 0 });
  const [originLatLng,  setOriginLatLng]  = useState<LatLng | null>(null);
  const [destLatLng,    setDestLatLng]    = useState<LatLng | null>(null);
  const [pickingFor,    setPickingFor]    = useState<"origin" | "dest" | null>(null);
  const [selectedRoute, setSelectedRoute] = useState<number | null>(null);

  // ── Load DB traffic records ────────────────────────────────────────────
  useEffect(() => {
    void (async () => {
      try {
        const res  = await getLiveTrafficFromApiAsync();
        const data = Array.isArray(res) ? res : (res?.data ?? []);
        setRecords(data);
      } catch (e) { console.error(e); }
    })();
  }, []);

  // ── Fetch TomTom real-time data ────────────────────────────────────────
  const fetchRealtime = useCallback(async () => {
    setRealtimeLoading(true);
    setRealtimeError("");
    try {
      const res = await getRealtimeTrafficFromApiAsync();

      // res can be { success, count, data } or direct array
      const points: RealtimePoint[] =
        res?.data ? res.data :
        Array.isArray(res) ? res : [];

      setRealtimePoints(points);
      setRealtimeLastFetch(new Date());
    } catch (e) {
      setRealtimeError("TomTom data fetch failed. Backend running ද?");
      console.error("[realtime]", e);
    } finally {
      setRealtimeLoading(false);
    }
  }, []);

  // Auto-refresh every 60s when enabled
  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(fetchRealtime, 60_000);
    return () => clearInterval(id);
  }, [autoRefresh, fetchRealtime]);

  // ── Map click ──────────────────────────────────────────────────────────
  const handleMapClick = (latlng: LatLng) => {
    if (tab === "predict") {
      setPicked(latlng);
      const now = new Date();
      setPredForm((p) => ({ ...p, hour: now.getHours(), day: now.getDay() }));
      return;
    }
    if (pickingFor === "origin") {
      setOriginLatLng(latlng);
      setRouteForm((p) => ({ ...p, originName: "Custom Location" }));
      setPickingFor("dest");
    } else if (pickingFor === "dest") {
      setDestLatLng(latlng);
      setRouteForm((p) => ({ ...p, destinationName: "Custom Location" }));
      setPickingFor(null);
    }
  };

  const cityByName = (n: string) => SRI_LANKA_CITIES.find((c) => c.name === n);

  const handleOriginCity = (name: string) => {
    setRouteForm((p) => ({ ...p, originName: name }));
    const c = cityByName(name);
    setOriginLatLng(c ? { lat: c.lat, lng: c.lng } : null);
    setRouteResult(null);
  };
  const handleDestCity = (name: string) => {
    setRouteForm((p) => ({ ...p, destinationName: name }));
    const c = cityByName(name);
    setDestLatLng(c ? { lat: c.lat, lng: c.lng } : null);
    setRouteResult(null);
  };

  const clearRoute = () => {
    setOriginLatLng(null); setDestLatLng(null);
    setRouteForm((p) => ({ ...p, originName: "", destinationName: "" }));
    setPickingFor(null); setRouteResult(null); setSelectedRoute(null);
  };

  const predict = async () => {
    try { setPredLoading(true); setPredResult(await predictTrafficFromApiAsync(predForm)); }
    catch (e) { console.error(e); }
    finally { setPredLoading(false); }
  };

  const analyseRoute = async () => {
    if (!originLatLng || !destLatLng) return;
    try {
      setRouteLoading(true); setRouteResult(null); setSelectedRoute(null);
      const r = await analyseRouteFromApiAsync({
        originName:      routeForm.originName || "Custom Location",
        originLat:       originLatLng.lat, originLng: originLatLng.lng,
        destinationName: routeForm.destinationName || "Custom Location",
        destinationLat:  destLatLng.lat, destinationLng: destLatLng.lng,
        weather:         routeForm.weather,
      });
      setRouteResult(r);
      if (r.routes?.length) {
        const rec = r.routes.findIndex((rt: RouteOption) => rt.isRecommended);
        setSelectedRoute(rec >= 0 ? rec : 0);
      }
    } catch (e) { console.error(e); }
    finally { setRouteLoading(false); }
  };

  const trafficPoints: TrafficPoint[] = records.map((r) => ({
    lat: Number(r.latitude), lng: Number(r.longitude),
    congestionLevel: Number(r.congestionLevel),
  }));

  const selectionMode =
    tab === "route"
      ? pickingFor === "origin" ? "origin"
      : pickingFor === "dest"   ? "destination"
      : null
    : null;

  const mapRoutes = tab === "route" ? (routeResult?.routes ?? []) : [];

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <DashboardLayout title="Traffic Management">
      <div className="space-y-6">

        {/* ── MAP + REALTIME PANEL ── */}
        <div className="relative overflow-hidden rounded-3xl border border-white/30 bg-white/20 p-5 shadow-2xl backdrop-blur-xl">

          {/* Header */}
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-green-500 text-white shadow-lg">
              <MapPin size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Live Traffic Map</h2>
              <p className="text-xs text-slate-500">
                {pickingFor === "origin" ? "🔵 Map click → Starting Point pick"
                : pickingFor === "dest"  ? "🟢 Map click → Ending Point pick"
                : "Map click → location pick"}
              </p>
            </div>

            {/* TomTom Real-time controls */}
            <div className="ml-auto flex flex-wrap items-center gap-2">

              {/* Last fetch time */}
              {realtimeLastFetch && (
                <span className="text-xs text-slate-400">
                  Updated: {realtimeLastFetch.toLocaleTimeString()}
                </span>
              )}

              {/* Auto refresh toggle */}
              <button type="button"
                onClick={() => setAutoRefresh((v) => !v)}
                className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition ${
                  autoRefresh
                    ? "bg-green-600 text-white shadow"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {autoRefresh ? <Wifi size={13}/> : <WifiOff size={13}/>}
                {autoRefresh ? "Auto ON" : "Auto OFF"}
              </button>

              {/* Manual fetch button */}
              <button type="button"
                onClick={fetchRealtime}
                disabled={realtimeLoading}
                className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-blue-700 disabled:opacity-60"
              >
                {realtimeLoading
                  ? <Loader2 size={13} className="animate-spin"/>
                  : <RefreshCw size={13}/>
                }
                {realtimeLoading ? "Fetching…" : "Fetch Live Data"}
              </button>

              {tab === "route" && (
                <>
                  <button type="button"
                    onClick={() => setPickingFor(pickingFor === "origin" ? null : "origin")}
                    className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition ${
                      pickingFor === "origin" ? "bg-blue-600 text-white shadow" : "bg-blue-50 text-blue-700 hover:bg-blue-100"
                    }`}
                  >
                    <MapPin size={13}/> {pickingFor === "origin" ? "Click Map…" : "Pick A"}
                  </button>
                  <button type="button"
                    onClick={() => setPickingFor(pickingFor === "dest" ? null : "dest")}
                    className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition ${
                      pickingFor === "dest" ? "bg-green-600 text-white shadow" : "bg-green-50 text-green-700 hover:bg-green-100"
                    }`}
                  >
                    <Navigation size={13}/> {pickingFor === "dest" ? "Click Map…" : "Pick B"}
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Error banner */}
          {realtimeError && (
            <div className="mb-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-2.5 text-xs font-semibold text-red-700">
              ⚠️ {realtimeError}
            </div>
          )}

          {/* Real-time stats bar */}
          {realtimePoints.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-2">
              {realtimePoints.map((p) => (
                <div key={`${p.latitude}-${p.longitude}`}
                  className={`flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-semibold ${
                    p.congestionLevel >= 75 ? "border-red-200 bg-red-50 text-red-700" :
                    p.congestionLevel >= 40 ? "border-yellow-200 bg-yellow-50 text-yellow-700" :
                    "border-green-200 bg-green-50 text-green-700"
                  }`}
                >
                  <span className={`h-2 w-2 rounded-full ${
                    p.congestionLevel >= 75 ? "bg-red-500" :
                    p.congestionLevel >= 40 ? "bg-yellow-500" : "bg-green-500"
                  }`}/>
                  <span>{p.locationName}</span>
                  <span className="font-bold">{p.currentSpeedKmh} km/h</span>
                </div>
              ))}
            </div>
          )}

          {/* Map */}
          <TrafficMap
            trafficPoints={trafficPoints}
            realtimePoints={realtimePoints}
            onLocationPick={handleMapClick}
            selectionMode={selectionMode}
            pickedLocation={tab === "predict" ? picked : null}
            originLocation={tab === "route" ? originLatLng : null}
            destLocation={tab === "route" ? destLatLng : null}
            routes={mapRoutes}
            selectedRoute={selectedRoute}
            onRouteSelect={setSelectedRoute}
            height="380px"
          />

          {/* A/B coordinate badges */}
          {tab === "route" && (originLatLng || destLatLng) && (
            <div className="mt-3 flex flex-wrap gap-2">
              {originLatLng && (
                <div className="flex items-center gap-2 rounded-xl bg-blue-100 px-3 py-2 text-xs font-bold text-blue-700">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-[10px] text-white">A</span>
                  {originLatLng.lat.toFixed(4)}, {originLatLng.lng.toFixed(4)}
                </div>
              )}
              {destLatLng && (
                <div className="flex items-center gap-2 rounded-xl bg-green-100 px-3 py-2 text-xs font-bold text-green-700">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-green-600 text-[10px] text-white">B</span>
                  {destLatLng.lat.toFixed(4)}, {destLatLng.lng.toFixed(4)}
                </div>
              )}
            </div>
          )}

          {/* Legend */}
          <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-400">
            <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-full bg-green-500 inline-block"/> Low</span>
            <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-full bg-yellow-500 inline-block"/> Moderate</span>
            <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-full bg-red-500 inline-block"/> High</span>
            {realtimePoints.length > 0 && (
              <span className="flex items-center gap-1 text-blue-500 font-semibold">
                <Wifi size={11}/> TomTom Live ({realtimePoints.length} points)
              </span>
            )}
            {tab === "route" && mapRoutes.length > 0 && (
              <span className="flex items-center gap-1 ml-2">
                <span className="h-1 w-6 rounded bg-indigo-500 inline-block"/> Selected route
              </span>
            )}
          </div>
        </div>

        {/* ── TABS ── */}
        <div className="flex rounded-2xl border border-white/50 bg-white/30 p-1 shadow">
          {([
            { id: "predict", label: "AI Prediction",    icon: Gauge },
            { id: "route",   label: "Route Suggestions", icon: Navigation },
          ] as const).map((t) => (
            <button key={t.id} type="button" onClick={() => setTab(t.id)}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold transition ${
                tab === t.id
                  ? "bg-gradient-to-r from-blue-600 to-green-500 text-white shadow"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <t.icon size={16} /> {t.label}
            </button>
          ))}
        </div>

        {/* ── PREDICT TAB ── */}
        {tab === "predict" && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="relative overflow-hidden rounded-3xl border border-white/30 bg-white/20 p-6 shadow-2xl backdrop-blur-xl">
              <h2 className="mb-5 flex items-center gap-2 text-lg font-bold text-slate-900">
                <Route size={20} className="text-blue-600"/> AI Traffic Prediction
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="mb-1 flex items-center gap-2 text-sm font-semibold text-slate-700"><Clock size={14} className="text-blue-600"/> Hour</label>
                  <input type="number" min={0} max={23} value={predForm.hour}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setPredForm((p) => ({ ...p, hour: Number(e.target.value) }))}
                    className="w-full rounded-2xl border border-white/50 bg-white/70 px-4 py-2.5 text-sm font-semibold text-slate-800 outline-none"/>
                </div>
                <div>
                  <label className="mb-1 flex items-center gap-2 text-sm font-semibold text-slate-700"><CalendarDays size={14} className="text-blue-600"/> Day</label>
                  <select value={predForm.day} onChange={(e) => setPredForm((p) => ({ ...p, day: Number(e.target.value) }))}
                    className="w-full rounded-2xl border border-white/50 bg-white/70 px-4 py-2.5 text-sm font-semibold text-slate-800 outline-none">
                    {dayOptions.map((d, i) => <option key={d} value={i}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 flex items-center gap-2 text-sm font-semibold text-slate-700"><CloudSun size={14} className="text-blue-600"/> Weather</label>
                  <select value={predForm.weather} onChange={(e) => setPredForm((p) => ({ ...p, weather: Number(e.target.value) }))}
                    className="w-full rounded-2xl border border-white/50 bg-white/70 px-4 py-2.5 text-sm font-semibold text-slate-800 outline-none">
                    {weatherOptions.map((w, i) => <option key={w} value={i}>{w}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 flex items-center gap-2 text-sm font-semibold text-slate-700"><Car size={14} className="text-blue-600"/> Vehicle Count</label>
                  <input type="number" min={0} value={predForm.vehicleCount}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setPredForm((p) => ({ ...p, vehicleCount: Number(e.target.value) }))}
                    className="w-full rounded-2xl border border-white/50 bg-white/70 px-4 py-2.5 text-sm font-semibold text-slate-800 outline-none"/>
                </div>
              </div>
              <button type="button" onClick={predict} disabled={predLoading}
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-green-500 py-3 font-bold text-white shadow-lg transition hover:scale-[1.01] disabled:opacity-60">
                {predLoading && <Loader2 size={18} className="animate-spin"/>}
                {predLoading ? "Predicting…" : "Predict Traffic"}
              </button>
            </div>

            <div className="space-y-4">
              {predResult ? (
                <div className="rounded-3xl border border-blue-200/60 bg-blue-50/70 p-6 shadow-xl">
                  <div className="mb-4 flex items-center gap-3">
                    <Gauge size={24} className="text-blue-600"/>
                    <div>
                      <p className="text-xs text-slate-500">Congestion Level</p>
                      <p className={`text-4xl font-extrabold ${congestionColor(predResult.predictedCongestionLevel)}`}>
                        {predResult.predictedCongestionLevel.toFixed(1)}<span className="text-lg font-medium text-slate-400"> / 100</span>
                      </p>
                    </div>
                    <span className={`ml-auto rounded-full px-3 py-1 text-xs font-bold ${congestionBg(predResult.predictedCongestionLevel)}`}>
                      {predResult.status}
                    </span>
                  </div>
                  <div className="mb-4 h-3 overflow-hidden rounded-full bg-slate-200">
                    <div className={`h-full rounded-full transition-all duration-700 ${congestionBar(predResult.predictedCongestionLevel)}`}
                      style={{ width: `${Math.min(100, predResult.predictedCongestionLevel)}%` }}/>
                  </div>
                  <div className="rounded-2xl bg-white/70 p-3">
                    <p className="text-xs text-slate-500">💡 AI Suggestion</p>
                    <p className="mt-1 text-sm font-semibold text-slate-800">{predResult.suggestion}</p>
                  </div>
                </div>
              ) : (
                <div className="flex min-h-52 items-center justify-center rounded-3xl border-2 border-dashed border-blue-300/60 bg-blue-50/40 text-center">
                  <div><p className="text-3xl">🚦</p><p className="mt-2 text-sm text-slate-400">Form fill කරලා predict කරන්න</p></div>
                </div>
              )}

              {/* Live records */}
              <div className="rounded-3xl border border-white/30 bg-white/20 p-5 shadow-xl">
                <h3 className="mb-3 flex items-center gap-2 font-bold text-slate-900">
                  <RefreshCw size={14}/> DB Records
                  <span className="ml-auto rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700">{records.length}</span>
                </h3>
                <div className="max-h-48 space-y-2 overflow-auto pr-1">
                  {records.length === 0
                    ? <p className="py-3 text-center text-sm text-slate-400">No records.</p>
                    : records.map((r) => (
                      <div key={r.trafficDataId} className="flex items-center justify-between rounded-2xl bg-white/60 px-4 py-2.5 text-sm shadow-sm">
                        <span className="text-slate-600">📍 {Number(r.latitude).toFixed(4)}, {Number(r.longitude).toFixed(4)}</span>
                        <span className={`font-bold ${congestionColor(r.congestionLevel)}`}>{r.congestionLevel.toFixed(0)}%</span>
                      </div>
                    ))
                  }
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── ROUTE TAB ── */}
        {tab === "route" && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Form */}
            <div className="relative overflow-hidden rounded-3xl border border-white/30 bg-white/20 p-6 shadow-2xl backdrop-blur-xl">
              <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-slate-900">
                <Navigation size={20} className="text-green-600"/> Route Suggestions
              </h2>
              <div className="mb-4 flex items-start gap-2 rounded-2xl border border-blue-200/60 bg-blue-50/60 px-4 py-3 text-xs text-slate-600">
                <MousePointer2 size={15} className="mt-0.5 shrink-0 text-blue-600"/>
                <span>City select <b>හෝ</b> map click → A/B pick. AI real Sri Lanka routes suggest කරනවා.</span>
              </div>

              <div className="space-y-4">
                {/* Origin */}
                <div>
                  <label className="mb-1 flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white">A</span>
                    Starting Point
                  </label>
                  <select value={SRI_LANKA_CITIES.some((c) => c.name === routeForm.originName) ? routeForm.originName : ""}
                    onChange={(e) => handleOriginCity(e.target.value)}
                    className="w-full rounded-2xl border border-white/50 bg-white/70 px-4 py-2.5 text-sm font-semibold text-slate-800 outline-none">
                    <option value="">-- Select city --</option>
                    {SRI_LANKA_CITIES.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
                  </select>
                  {originLatLng && <p className="mt-1 text-xs text-blue-600">📍 {originLatLng.lat.toFixed(5)}, {originLatLng.lng.toFixed(5)}</p>}
                  <button type="button" onClick={() => setPickingFor("origin")}
                    className={`mt-2 flex w-full items-center justify-center gap-2 rounded-xl py-2 text-xs font-bold transition ${
                      pickingFor === "origin" ? "bg-blue-600 text-white" : "bg-blue-50 text-blue-700 hover:bg-blue-100"}`}>
                    <MapPin size={13}/> {pickingFor === "origin" ? "Click on Map…" : "Pick from Map"}
                  </button>
                </div>

                {/* Destination */}
                <div>
                  <label className="mb-1 flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-green-600 text-[10px] font-bold text-white">B</span>
                    Ending Point
                  </label>
                  <select value={SRI_LANKA_CITIES.some((c) => c.name === routeForm.destinationName) ? routeForm.destinationName : ""}
                    onChange={(e) => handleDestCity(e.target.value)}
                    className="w-full rounded-2xl border border-white/50 bg-white/70 px-4 py-2.5 text-sm font-semibold text-slate-800 outline-none">
                    <option value="">-- Select city --</option>
                    {SRI_LANKA_CITIES.filter((c) => c.name !== routeForm.originName).map((c) => (
                      <option key={c.name} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                  {destLatLng && <p className="mt-1 text-xs text-green-600">🏁 {destLatLng.lat.toFixed(5)}, {destLatLng.lng.toFixed(5)}</p>}
                  <button type="button" onClick={() => setPickingFor("dest")}
                    className={`mt-2 flex w-full items-center justify-center gap-2 rounded-xl py-2 text-xs font-bold transition ${
                      pickingFor === "dest" ? "bg-green-600 text-white" : "bg-green-50 text-green-700 hover:bg-green-100"}`}>
                    <Navigation size={13}/> {pickingFor === "dest" ? "Click on Map…" : "Pick from Map"}
                  </button>
                </div>

                {/* Weather */}
                <div>
                  <label className="mb-1 flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <CloudSun size={14} className="text-blue-600"/> Weather
                  </label>
                  <select value={routeForm.weather} onChange={(e) => setRouteForm((p) => ({ ...p, weather: Number(e.target.value) }))}
                    className="w-full rounded-2xl border border-white/50 bg-white/70 px-4 py-2.5 text-sm font-semibold text-slate-800 outline-none">
                    {weatherOptions.map((w, i) => <option key={w} value={i}>{w}</option>)}
                  </select>
                </div>
              </div>

              {/* Progress */}
              <div className="mt-4 rounded-2xl bg-white/60 p-3">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500 font-semibold">Selection</span>
                  <span className={`font-bold ${originLatLng && destLatLng ? "text-green-600" : "text-orange-500"}`}>
                    {originLatLng && destLatLng ? "✓ Ready" : "Incomplete"}
                  </span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">
                  <div className="h-full rounded-full bg-gradient-to-r from-blue-600 to-green-500 transition-all duration-500"
                    style={{ width: originLatLng && destLatLng ? "100%" : originLatLng || destLatLng ? "50%" : "0%" }}/>
                </div>
              </div>

              <div className="mt-5 flex gap-2">
                <button type="button" onClick={clearRoute}
                  className="rounded-2xl border border-slate-200 bg-white/70 px-4 py-3 text-sm font-bold text-slate-600 hover:bg-white">Clear</button>
                <button type="button" onClick={analyseRoute}
                  disabled={routeLoading || !originLatLng || !destLatLng}
                  className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-green-500 to-blue-600 py-3 font-bold text-white shadow-lg transition hover:scale-[1.01] disabled:opacity-50">
                  {routeLoading && <Loader2 size={18} className="animate-spin"/>}
                  {routeLoading ? "Getting Routes…" : "🗺️ Get Route Suggestions"}
                </button>
              </div>
            </div>

            {/* Results */}
            <div className="space-y-4">
              {routeResult ? (
                <>
                  {routeResult.summary && (
                    <div className="rounded-2xl border border-slate-200/60 bg-white/60 px-4 py-3 text-sm text-slate-700">
                      🤖 <span className="font-semibold">AI:</span> {routeResult.summary}
                    </div>
                  )}

                  {routeResult.routes && routeResult.routes.length > 0 ? (
                    <div className="space-y-3">
                      {routeResult.routes.map((route, idx) => {
                        const isSel = idx === selectedRoute;
                        return (
                          <button key={idx} type="button" onClick={() => setSelectedRoute(idx)}
                            className={`w-full rounded-3xl border-2 p-5 text-left shadow-lg transition-all ${
                              isSel ? "border-indigo-400 bg-indigo-50/80 scale-[1.01]" : "border-white/50 bg-white/60 hover:border-slate-300"
                            }`}>
                            <div className="mb-3 flex items-center gap-3">
                              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-white shadow ${isSel ? "bg-indigo-600" : "bg-slate-400"}`}>
                                {route.isRecommended ? <Star size={18} className="fill-white"/> : <span className="text-sm font-bold">{idx + 1}</span>}
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <p className="font-bold text-slate-900">{route.routeName}</p>
                                  {route.isRecommended && <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-bold text-yellow-700">⭐ Best</span>}
                                  {isSel && <span className="ml-auto rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-bold text-indigo-700">✓ Selected</span>}
                                </div>
                                <p className="text-xs text-slate-500">{route.roadNames}</p>
                              </div>
                            </div>
                            <div className="mb-3 grid grid-cols-3 gap-2">
                              <div className="rounded-xl bg-white/80 p-2.5 text-center">
                                <p className="text-xs text-slate-400">Distance</p>
                                <p className="text-sm font-bold text-blue-700">{route.distanceKm} km</p>
                              </div>
                              <div className="rounded-xl bg-white/80 p-2.5 text-center">
                                <p className="text-xs text-slate-400">Time</p>
                                <p className="text-sm font-bold text-purple-700">{fmtTime(route.estimatedMinutes)}</p>
                              </div>
                              <div className="rounded-xl bg-white/80 p-2.5 text-center">
                                <p className="text-xs text-slate-400">Risk</p>
                                <div className="flex items-center justify-center gap-1">
                                  {riskIcon(route.riskScore)}
                                  <p className={`text-sm font-bold ${congestionColor(route.riskScore)}`}>{route.riskScore.toFixed(0)}</p>
                                </div>
                              </div>
                            </div>
                            <div className="mb-2 h-2.5 overflow-hidden rounded-full bg-slate-200">
                              <div className={`h-full rounded-full transition-all duration-700 ${congestionBar(route.congestionLevel)}`}
                                style={{ width: `${route.congestionLevel}%` }}/>
                            </div>
                            <div className="mb-2 flex justify-between text-xs">
                              <span className="text-slate-400">Traffic</span>
                              <span className={`rounded-full px-2 py-0.5 font-bold ${congestionBg(route.congestionLevel)}`}>{route.congestionStatus}</span>
                            </div>
                            <p className="text-xs leading-relaxed text-slate-600">💡 {route.reason}</p>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    /* Single result fallback */
                    <div className="rounded-3xl border border-slate-200 bg-white/70 p-6 shadow-xl">
                      <div className="mb-4 flex items-center gap-2">
                        <span className="font-bold text-slate-700">{routeResult.originName}</span>
                        <div className="flex flex-1 items-center gap-1">
                          <div className="h-0.5 flex-1 bg-slate-300"/>
                          <Navigation size={14} className="text-indigo-500"/>
                          <div className="h-0.5 flex-1 bg-slate-300"/>
                        </div>
                        <span className="font-bold text-slate-700">{routeResult.destinationName}</span>
                      </div>
                      <div className="mb-4 grid grid-cols-3 gap-3">
                        <div className="rounded-2xl bg-white/70 p-3 text-center">
                          <p className="text-xs text-slate-500">Distance</p>
                          <p className="text-lg font-extrabold text-blue-700">{routeResult.distanceKm} km</p>
                        </div>
                        <div className="rounded-2xl bg-white/70 p-3 text-center">
                          <p className="text-xs text-slate-500">Time</p>
                          <p className="text-lg font-extrabold text-purple-700">{fmtTime(routeResult.estimatedMinutes)}</p>
                        </div>
                        <div className="rounded-2xl bg-white/70 p-3 text-center">
                          <p className="text-xs text-slate-500">Risk</p>
                          <div className="flex items-center justify-center gap-1">
                            {riskIcon(routeResult.riskScore)}
                            <p className={`text-lg font-extrabold ${congestionColor(routeResult.riskScore)}`}>{routeResult.riskScore.toFixed(0)}</p>
                          </div>
                        </div>
                      </div>
                      <div className="rounded-2xl bg-white/70 p-3">
                        <p className="text-xs text-slate-500">🤖 AI Suggestion</p>
                        <p className="mt-1 text-sm font-semibold text-slate-800">{routeResult.suggestion}</p>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex min-h-64 items-center justify-center rounded-3xl border-2 border-dashed border-green-300/60 bg-green-50/40 text-center">
                  {routeLoading ? (
                    <div>
                      <Loader2 size={36} className="mx-auto animate-spin text-green-500"/>
                      <p className="mt-3 font-bold text-slate-600">AI routes analysing…</p>
                      <p className="mt-1 text-sm text-slate-400">Claude Sri Lanka roads check කරනවා</p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-4xl">🗺️</p>
                      <p className="mt-3 font-bold text-slate-700">AI Route Suggester</p>
                      <p className="mt-1 text-sm text-slate-400">A + B set කරලා Get Route Suggestions click</p>
                    </div>
                  )}
                </div>
              )}

              <div className="rounded-3xl border border-white/30 bg-white/20 p-5 shadow-xl">
                <h3 className="mb-2 flex items-center gap-2 font-bold text-slate-900"><History size={16}/> Recent Routes</h3>
                <p className="text-center text-xs text-slate-400 py-2">Route analyse කළාම history show වෙනවා.</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}