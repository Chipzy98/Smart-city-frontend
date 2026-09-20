"use client";

import { useEffect, useState, type ChangeEvent } from "react";
import {
  Car, CloudSun, CalendarDays, Clock, Gauge,
  Route, Loader2, MapPin, Navigation, History, RefreshCw,
  AlertTriangle, CheckCircle2, Minus,
  MousePointer2, Star,
} from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import {
  getLiveTrafficFromApiAsync,
  predictTrafficFromApiAsync,
  analyseRouteFromApiAsync,
} from "../api/smartCityApi";
import type { LatLng, RouteOption } from "@/components/maps/TrafficMap";
import GoogleTrafficMap from "@/components/maps/GoogleTrafficMap";
import PlacesAutocomplete from "@/components/maps/PlacesAutocomplete";

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



  // Predict
  const [predResult,  setPredResult]  = useState<PredictResult | null>(null);
  const [predLoading, setPredLoading] = useState(false);
  const [predForm,    setPredForm]    = useState<PredictForm>({
    hour: new Date().getHours(), day: new Date().getDay(), weather: 0, vehicleCount: 300,
  });

  // Route
  const [routeResult,  setRouteResult]  = useState<RouteResult | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeForm,    setRouteForm]    = useState<RouteForm>({ originName: "", destinationName: "", weather: 0 });
  const [originLatLng, setOriginLatLng] = useState<LatLng | null>(null);
  const [destLatLng,   setDestLatLng]   = useState<LatLng | null>(null);
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



  const clearRoute = () => {
    setOriginLatLng(null); setDestLatLng(null);
    setRouteForm((p) => ({ ...p, originName: "", destinationName: "" }));
    setRouteResult(null); setSelectedRoute(null);
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

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <DashboardLayout title="Traffic Management">
      <div className="space-y-6">

        {/* ── MAP + LIVE TRAFFIC (self-contained) ── */}
        <GoogleTrafficMap height="520px" />

        {/* ── TABS ── */}
        <div className="flex rounded-2xl border border-white/50 bg-white/30 p-1 shadow">
          {([
            { id: "predict", label: "AI Prediction",    icon: Gauge },
            { id: "route",   label: "Route Suggestions", icon: Navigation },
          ] as const).map((t) => (
            <button key={t.id} type="button" onClick={() => setTab(t.id)}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold transition ${
                tab === t.id
                  ? "bg-linear-to-r from-blue-600 to-green-500 text-white shadow"
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
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-linear-to-r from-blue-600 to-green-500 py-3 font-bold text-white shadow-lg transition hover:scale-[1.01] disabled:opacity-60">
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
                <span>Google Places search → A/B pick. AI real Sri Lanka routes suggest කරනවා.</span>
              </div>

              <div className="space-y-4">
                {/* Origin */}
                <div>
                  <PlacesAutocomplete
                    label="Starting Point"
                    badgeLetter="A"
                    pinColor="blue"
                    placeholder="Type a location in Sri Lanka…"
                    value={routeForm.originName}
                    onChange={(name, latlng) => {
                      setRouteForm((p) => ({ ...p, originName: name }));
                      setOriginLatLng(latlng);
                    }}
                  />
                  {originLatLng && <p className="mt-1 text-xs text-blue-600">📍 {originLatLng.lat.toFixed(5)}, {originLatLng.lng.toFixed(5)}</p>}
                </div>

                {/* Destination */}
                <div>
                  <PlacesAutocomplete
                    label="Ending Point"
                    badgeLetter="B"
                    pinColor="green"
                    placeholder="Type a destination in Sri Lanka…"
                    value={routeForm.destinationName}
                    onChange={(name, latlng) => {
                      setRouteForm((p) => ({ ...p, destinationName: name }));
                      setDestLatLng(latlng);
                    }}
                  />
                  {destLatLng && <p className="mt-1 text-xs text-green-600">🏁 {destLatLng.lat.toFixed(5)}, {destLatLng.lng.toFixed(5)}</p>}
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
                  <div className="h-full rounded-full bg-linear-to-r from-blue-600 to-green-500 transition-all duration-500"
                    style={{ width: originLatLng && destLatLng ? "100%" : originLatLng || destLatLng ? "50%" : "0%" }}/>
                </div>
              </div>

              <div className="mt-5 flex gap-2">
                <button type="button" onClick={clearRoute}
                  className="rounded-2xl border border-slate-200 bg-white/70 px-4 py-3 text-sm font-bold text-slate-600 hover:bg-white">Clear</button>
                <button type="button" onClick={analyseRoute}
                  disabled={routeLoading || !originLatLng || !destLatLng}
                  className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-linear-to-r from-green-500 to-blue-600 py-3 font-bold text-white shadow-lg transition hover:scale-[1.01] disabled:opacity-50">
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
                <p className="text-center text-xs text-slate-400 py-2"></p>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}