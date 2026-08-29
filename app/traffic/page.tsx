"use client";

import { useEffect, useState, type ChangeEvent } from "react";
import dynamic from "next/dynamic";
import {
  Car, CloudSun, CalendarDays, Clock, Gauge,
  Route, Loader2, MapPin, Navigation, History,
  AlertTriangle, CheckCircle2, Minus, RefreshCw,
} from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import {
  getLiveTrafficFromApiAsync,
  predictTrafficFromApiAsync,
  analyseRouteFromApiAsync,
} from "@/app/api/smartCityApi";
import type { LatLng, TrafficPoint } from "@/components/maps/TrafficMap";

const TrafficMap = dynamic(() => import("@/components/maps/TrafficMap"), {
  ssr:     false,
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
  routeTrafficId:   string;
  originName:       string;
  destinationName:  string;
  distanceKm:       number;
  estimatedMinutes: number;
  congestionLevel:  number;
  congestionStatus: string;
  suggestion:       string;
  riskScore:        number;
};

type PredictForm = {
  hour:         number;
  day:          number;
  weather:      number;
  vehicleCount: number;
};

type RouteForm = {
  originName:      string;
  destinationName: string;
  weather:         number;
};

// ── Helpers ────────────────────────────────────────────────────────────────

const weatherOptions = ["Clear ☀️", "Cloudy ⛅", "Rainy 🌧️", "Stormy ⛈️"];
const dayOptions     = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

function congestionColor(l: number) {
  return l >= 75 ? "text-red-600" : l >= 40 ? "text-yellow-600" : "text-green-600";
}
function congestionBg(l: number) {
  return l >= 75 ? "bg-red-100 text-red-700" : l >= 40 ? "bg-yellow-100 text-yellow-700" : "bg-green-100 text-green-700";
}
function riskIcon(r: number) {
  if (r >= 65) return <AlertTriangle size={16} className="text-red-500" />;
  if (r >= 35) return <Minus size={16} className="text-yellow-500" />;
  return <CheckCircle2 size={16} className="text-green-500" />;
}

const SRI_LANKA_CITIES = [
  { name: "Colombo",       lat: 6.9271, lng: 79.8612 },
  { name: "Kandy",         lat: 7.2906, lng: 80.6337 },
  { name: "Galle",         lat: 6.0535, lng: 80.2210 },
  { name: "Jaffna",        lat: 9.6615, lng: 80.0255 },
  { name: "Negombo",       lat: 7.2094, lng: 79.8358 },
  { name: "Matara",        lat: 5.9549, lng: 80.5550 },
  { name: "Trincomalee",   lat: 8.5874, lng: 81.2152 },
  { name: "Anuradhapura",  lat: 8.3114, lng: 80.4037 },
  { name: "Batticaloa",    lat: 7.7170, lng: 81.6924 },
  { name: "Ratnapura",     lat: 6.6828, lng: 80.3992 },
  { name: "Colombo Fort",  lat: 6.9344, lng: 79.8428 },
  { name: "Kurunegala",    lat: 7.4867, lng: 80.3647 },
];

// ── Component ──────────────────────────────────────────────────────────────

export default function TrafficPage() {
  const [tab,        setTab]        = useState<PageTab>("predict");
  const [records,    setRecords]    = useState<TrafficRecord[]>([]);
  const [picked,     setPicked]     = useState<LatLng | null>(null);

  // Predict tab
  const [predResult, setPredResult] = useState<PredictResult | null>(null);
  const [predLoading,setPredLoading]= useState(false);
  const [predForm,   setPredForm]   = useState<PredictForm>({
    hour: new Date().getHours(), day: new Date().getDay(),
    weather: 0, vehicleCount: 300,
  });

  // Route tab
  const [routeResult,  setRouteResult]  = useState<RouteResult | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeForm,    setRouteForm]    = useState<RouteForm>({
    originName: "", destinationName: "", weather: 0,
  });
  const [originLatLng, setOriginLatLng] = useState<LatLng | null>(null);
  const [destLatLng,   setDestLatLng]   = useState<LatLng | null>(null);
  const [pickingFor,   setPickingFor]   = useState<"origin" | "dest" | null>(null);

  // Load live records
  useEffect(() => {
    void (async () => {
      try {
        const res  = await getLiveTrafficFromApiAsync();
        const data = Array.isArray(res) ? res : (res?.data ?? []);
        setRecords(data);
      } catch (e) { console.error(e); }
    })();
  }, []);

  // Map click handler
  const handleMapClick = (latlng: LatLng) => {
    if (pickingFor === "origin") {
      setOriginLatLng(latlng);
      setPickingFor(null);
    } else if (pickingFor === "dest") {
      setDestLatLng(latlng);
      setPickingFor(null);
    } else {
      // Predict tab — auto-fill time
      setPicked(latlng);
      const now = new Date();
      setPredForm((p) => ({ ...p, hour: now.getHours(), day: now.getDay() }));
    }
  };

  // City select helper
  const cityByName = (name: string) =>
    SRI_LANKA_CITIES.find((c) => c.name === name);

  const handleOriginCity = (name: string) => {
    setRouteForm((p) => ({ ...p, originName: name }));
    const c = cityByName(name);
    if (c) setOriginLatLng({ lat: c.lat, lng: c.lng });
  };

  const handleDestCity = (name: string) => {
    setRouteForm((p) => ({ ...p, destinationName: name }));
    const c = cityByName(name);
    if (c) setDestLatLng({ lat: c.lat, lng: c.lng });
  };

  // Predict submit
  const predict = async () => {
    try {
      setPredLoading(true);
      const r = await predictTrafficFromApiAsync(predForm);
      setPredResult(r);
    } finally { setPredLoading(false); }
  };

  // Route submit
  const analyseRoute = async () => {
    if (!routeForm.originName || !routeForm.destinationName) return;
    const origin = cityByName(routeForm.originName) ??
      (originLatLng ? { lat: originLatLng.lat, lng: originLatLng.lng } : null);
    const dest   = cityByName(routeForm.destinationName) ??
      (destLatLng ? { lat: destLatLng.lat, lng: destLatLng.lng } : null);

    if (!origin || !dest) return;

    try {
      setRouteLoading(true);
      const r = await analyseRouteFromApiAsync({
        originName:      routeForm.originName,
        originLat:       origin.lat,
        originLng:       origin.lng,
        destinationName: routeForm.destinationName,
        destinationLat:  dest.lat,
        destinationLng:  dest.lng,
        weather:         routeForm.weather,
      });
      setRouteResult(r);
    } finally { setRouteLoading(false); }
  };

  const trafficPoints: TrafficPoint[] = records.map((r) => ({
    lat: Number(r.latitude), lng: Number(r.longitude),
    congestionLevel: r.congestionLevel,
  }));

  // For map: show origin + dest markers when in route tab
  const mapPicked = tab === "route"
    ? (pickingFor === "origin" ? null : originLatLng ?? destLatLng)
    : picked;

  return (
    <DashboardLayout title="Traffic Management">
      <div className="space-y-6">

        {/* ── Map ── */}
        <div className="relative overflow-hidden rounded-3xl border border-white/30 bg-white/20 p-5 shadow-2xl backdrop-blur-xl">
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-green-500 text-white shadow">
              <MapPin size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Live Traffic Map</h2>
              <p className="text-xs text-slate-500">
                {tab === "route" && pickingFor
                  ? `📍 Map click කරලා ${pickingFor === "origin" ? "Origin" : "Destination"} pick කරන්න`
                  : "Map click කරලා location pick කරන්න"}
              </p>
            </div>

            {/* Route: pick buttons */}
            {tab === "route" && (
              <div className="ml-auto flex gap-2">
                <button
                  type="button"
                  onClick={() => setPickingFor(pickingFor === "origin" ? null : "origin")}
                  className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                    pickingFor === "origin"
                      ? "bg-blue-600 text-white"
                      : "bg-blue-50 text-blue-700 hover:bg-blue-100"
                  }`}
                >
                  📍 Pick Origin
                </button>
                <button
                  type="button"
                  onClick={() => setPickingFor(pickingFor === "dest" ? null : "dest")}
                  className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                    pickingFor === "dest"
                      ? "bg-green-600 text-white"
                      : "bg-green-50 text-green-700 hover:bg-green-100"
                  }`}
                >
                  🏁 Pick Destination
                </button>
              </div>
            )}
          </div>

          <TrafficMap
            trafficPoints={trafficPoints}
            onLocationPick={handleMapClick}
            pickedLocation={mapPicked}
            height="360px"
          />

          {/* Route: show both markers info */}
          {tab === "route" && (originLatLng || destLatLng) && (
            <div className="mt-3 flex flex-wrap gap-3">
              {originLatLng && (
                <span className="rounded-xl bg-blue-100 px-3 py-1 text-xs font-bold text-blue-700">
                  📍 Origin: {originLatLng.lat.toFixed(4)}, {originLatLng.lng.toFixed(4)}
                </span>
              )}
              {destLatLng && (
                <span className="rounded-xl bg-green-100 px-3 py-1 text-xs font-bold text-green-700">
                  🏁 Dest: {destLatLng.lat.toFixed(4)}, {destLatLng.lng.toFixed(4)}
                </span>
              )}
            </div>
          )}

          {/* Legend */}
          <div className="mt-2 flex gap-4 text-xs text-slate-400">
            <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-full bg-green-500 inline-block"/> Low</span>
            <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-full bg-yellow-500 inline-block"/> Moderate</span>
            <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-full bg-red-500 inline-block"/> High</span>
          </div>
        </div>

        {/* ── Tab Switch ── */}
        <div className="flex rounded-2xl border border-white/50 bg-white/30 p-1 shadow">
          {([
            { id: "predict", label: "🤖 AI Prediction",  icon: Gauge },
            { id: "route",   label: "🗺️ Route Analysis",  icon: Navigation },
          ] as const).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
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

        {/* ── Predict Tab ── */}
        {tab === "predict" && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Form */}
            <div className="relative overflow-hidden rounded-3xl border border-white/30 bg-white/20 p-6 shadow-2xl backdrop-blur-xl">
              <h2 className="mb-5 text-lg font-bold text-slate-900 flex items-center gap-2">
                <Route size={20} className="text-blue-600"/> AI Traffic Prediction
              </h2>
              <div className="space-y-3">
                {[
                  { name: "hour", label: "Hour of Day", icon: Clock, type: "number", min: 0, max: 23 },
                ].map((f) => (
                  <div key={f.name}>
                    <label className="mb-1 flex items-center gap-2 text-sm font-semibold text-slate-700">
                      <f.icon size={14} className="text-blue-600"/> {f.label}
                    </label>
                    <input
                      name={f.name} type={f.type}
                      min={f.min} max={f.max}
                      value={predForm[f.name as keyof PredictForm]}
                      onChange={(e: ChangeEvent<HTMLInputElement>) =>
                        setPredForm((p) => ({ ...p, [f.name]: Number(e.target.value) }))}
                      className="w-full rounded-2xl border border-white/50 bg-white/70 px-4 py-2.5 text-sm font-semibold text-slate-800 outline-none"
                    />
                  </div>
                ))}

                <div>
                  <label className="mb-1 flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <CalendarDays size={14} className="text-blue-600"/> Day
                  </label>
                  <select
                    value={predForm.day}
                    onChange={(e) => setPredForm((p) => ({ ...p, day: Number(e.target.value) }))}
                    className="w-full rounded-2xl border border-white/50 bg-white/70 px-4 py-2.5 text-sm font-semibold text-slate-800 outline-none"
                  >
                    {dayOptions.map((d, i) => <option key={d} value={i}>{d}</option>)}
                  </select>
                </div>

                <div>
                  <label className="mb-1 flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <CloudSun size={14} className="text-blue-600"/> Weather
                  </label>
                  <select
                    value={predForm.weather}
                    onChange={(e) => setPredForm((p) => ({ ...p, weather: Number(e.target.value) }))}
                    className="w-full rounded-2xl border border-white/50 bg-white/70 px-4 py-2.5 text-sm font-semibold text-slate-800 outline-none"
                  >
                    {weatherOptions.map((w, i) => <option key={w} value={i}>{w}</option>)}
                  </select>
                </div>

                <div>
                  <label className="mb-1 flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <Car size={14} className="text-blue-600"/> Vehicle Count
                  </label>
                  <input
                    type="number" min={0}
                    value={predForm.vehicleCount}
                    onChange={(e) => setPredForm((p) => ({ ...p, vehicleCount: Number(e.target.value) }))}
                    className="w-full rounded-2xl border border-white/50 bg-white/70 px-4 py-2.5 text-sm font-semibold text-slate-800 outline-none"
                  />
                </div>
              </div>

              <button
                type="button" onClick={predict} disabled={predLoading}
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-green-500 py-3 font-bold text-white shadow-lg transition hover:scale-[1.02] disabled:opacity-60"
              >
                {predLoading && <Loader2 size={18} className="animate-spin" />}
                {predLoading ? "Predicting…" : "🤖 Predict Traffic"}
              </button>
            </div>

            {/* Predict result */}
            <div className="space-y-4">
              {predResult ? (
                <div className="rounded-3xl border border-blue-200/60 bg-blue-50/70 p-6 shadow-xl backdrop-blur-md">
                  <div className="mb-4 flex items-center gap-3">
                    <Gauge size={24} className="text-blue-600" />
                    <div>
                      <p className="text-xs text-slate-500">Congestion Level</p>
                      <p className={`text-4xl font-extrabold ${congestionColor(predResult.predictedCongestionLevel)}`}>
                        {predResult.predictedCongestionLevel.toFixed(1)}
                        <span className="text-lg font-medium text-slate-400"> / 100</span>
                      </p>
                    </div>
                    <span className={`ml-auto rounded-full px-3 py-1 text-xs font-bold ${congestionBg(predResult.predictedCongestionLevel)}`}>
                      {predResult.status}
                    </span>
                  </div>
                  <div className="mb-4 h-3 overflow-hidden rounded-full bg-slate-200">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${
                        predResult.predictedCongestionLevel >= 75 ? "bg-red-500" :
                        predResult.predictedCongestionLevel >= 40 ? "bg-yellow-500" : "bg-green-500"
                      }`}
                      style={{ width: `${predResult.predictedCongestionLevel}%` }}
                    />
                  </div>
                  <div className="rounded-2xl bg-white/70 p-3">
                    <p className="text-xs text-slate-500">💡 Suggestion</p>
                    <p className="mt-1 text-sm font-semibold text-slate-800">{predResult.suggestion}</p>
                  </div>
                </div>
              ) : (
                <div className="flex min-h-52 items-center justify-center rounded-3xl border-2 border-dashed border-blue-300/60 bg-blue-50/40 text-center">
                  <div>
                    <p className="text-3xl">🚦</p>
                    <p className="mt-2 text-sm text-slate-400">Form fill කරලා predict කරන්න</p>
                  </div>
                </div>
              )}

              {/* Live records */}
              <div className="rounded-3xl border border-white/30 bg-white/20 p-5 shadow-xl backdrop-blur-xl">
                <h3 className="mb-3 font-bold text-slate-900 flex items-center gap-2">
                  <RefreshCw size={14} /> Live Records
                  <span className="ml-auto rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700">
                    {records.length}
                  </span>
                </h3>
                <div className="max-h-48 space-y-2 overflow-auto pr-1">
                  {records.length === 0
                    ? <p className="py-3 text-center text-sm text-slate-400">No records.</p>
                    : records.map((r) => (
                      <div key={r.trafficDataId} className="flex items-center justify-between rounded-2xl bg-white/60 px-4 py-2.5 text-sm shadow-sm">
                        <span className="text-slate-600">📍 {Number(r.latitude).toFixed(4)}, {Number(r.longitude).toFixed(4)}</span>
                        <span className={`font-bold ${congestionColor(r.congestionLevel)}`}>
                          {r.congestionLevel.toFixed(0)}%
                        </span>
                      </div>
                    ))
                  }
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Route Tab ── */}
        {tab === "route" && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Route Form */}
            <div className="relative overflow-hidden rounded-3xl border border-white/30 bg-white/20 p-6 shadow-2xl backdrop-blur-xl">
              <h2 className="mb-5 text-lg font-bold text-slate-900 flex items-center gap-2">
                <Navigation size={20} className="text-green-600"/> Route Traffic Analysis
              </h2>

              <p className="mb-4 rounded-2xl border border-blue-200/60 bg-blue-50/60 px-4 py-2.5 text-xs text-slate-600">
                📌 City select කරන්න <span className="font-bold">හෝ</span> map click කරලා location pick කරන්න
              </p>

              <div className="space-y-4">
                {/* Origin */}
                <div>
                  <label className="mb-1 flex items-center gap-2 text-sm font-semibold text-slate-700">
                    📍 Origin (Starting point)
                  </label>
                  <select
                    value={routeForm.originName}
                    onChange={(e) => handleOriginCity(e.target.value)}
                    className="w-full rounded-2xl border border-white/50 bg-white/70 px-4 py-2.5 text-sm font-semibold text-slate-800 outline-none"
                  >
                    <option value="">-- City select කරන්න --</option>
                    {SRI_LANKA_CITIES.map((c) => (
                      <option key={c.name} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                  {originLatLng && (
                    <p className="mt-1 text-xs text-blue-600">
                      📍 {originLatLng.lat.toFixed(4)}, {originLatLng.lng.toFixed(4)}
                    </p>
                  )}
                </div>

                {/* Destination */}
                <div>
                  <label className="mb-1 flex items-center gap-2 text-sm font-semibold text-slate-700">
                    🏁 Destination (Ending point)
                  </label>
                  <select
                    value={routeForm.destinationName}
                    onChange={(e) => handleDestCity(e.target.value)}
                    className="w-full rounded-2xl border border-white/50 bg-white/70 px-4 py-2.5 text-sm font-semibold text-slate-800 outline-none"
                  >
                    <option value="">-- City select කරන්න --</option>
                    {SRI_LANKA_CITIES.filter((c) => c.name !== routeForm.originName).map((c) => (
                      <option key={c.name} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                  {destLatLng && (
                    <p className="mt-1 text-xs text-green-600">
                      🏁 {destLatLng.lat.toFixed(4)}, {destLatLng.lng.toFixed(4)}
                    </p>
                  )}
                </div>

                {/* Weather */}
                <div>
                  <label className="mb-1 flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <CloudSun size={14} className="text-blue-600"/> Current Weather
                  </label>
                  <select
                    value={routeForm.weather}
                    onChange={(e) => setRouteForm((p) => ({ ...p, weather: Number(e.target.value) }))}
                    className="w-full rounded-2xl border border-white/50 bg-white/70 px-4 py-2.5 text-sm font-semibold text-slate-800 outline-none"
                  >
                    {weatherOptions.map((w, i) => <option key={w} value={i}>{w}</option>)}
                  </select>
                </div>
              </div>

              <button
                type="button"
                onClick={analyseRoute}
                disabled={routeLoading || !routeForm.originName || !routeForm.destinationName}
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-green-500 to-blue-600 py-3 font-bold text-white shadow-lg transition hover:scale-[1.02] disabled:opacity-50"
              >
                {routeLoading && <Loader2 size={18} className="animate-spin" />}
                {routeLoading ? "Analysing Route…" : "🗺️ Analyse Route Traffic"}
              </button>
            </div>

            {/* Route Result */}
            <div className="space-y-4">
              {routeResult ? (
                <>
                  {/* Route summary card */}
                  <div className={`relative overflow-hidden rounded-3xl border p-6 shadow-xl backdrop-blur-md ${
                    routeResult.congestionLevel >= 75 ? "border-red-200 bg-red-50/80"
                    : routeResult.congestionLevel >= 40 ? "border-yellow-200 bg-yellow-50/80"
                    : "border-green-200 bg-green-50/80"
                  }`}>
                    {/* Route header */}
                    <div className="mb-4 flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-700">{routeResult.originName}</span>
                      <div className="flex flex-1 items-center gap-1">
                        <div className="h-0.5 flex-1 bg-slate-300" />
                        <Navigation size={14} className="text-slate-400" />
                        <div className="h-0.5 flex-1 bg-slate-300" />
                      </div>
                      <span className="text-sm font-bold text-slate-700">{routeResult.destinationName}</span>
                    </div>

                    {/* Key metrics */}
                    <div className="mb-4 grid grid-cols-3 gap-3">
                      <div className="rounded-2xl bg-white/70 p-3 text-center">
                        <p className="text-xs text-slate-500">Distance</p>
                        <p className="text-lg font-extrabold text-blue-700">{routeResult.distanceKm} km</p>
                      </div>
                      <div className="rounded-2xl bg-white/70 p-3 text-center">
                        <p className="text-xs text-slate-500">Est. Time</p>
                        <p className="text-lg font-extrabold text-purple-700">
                          {Math.floor(routeResult.estimatedMinutes / 60) > 0
                            ? `${Math.floor(routeResult.estimatedMinutes / 60)}h ${routeResult.estimatedMinutes % 60}m`
                            : `${routeResult.estimatedMinutes}m`}
                        </p>
                      </div>
                      <div className="rounded-2xl bg-white/70 p-3 text-center">
                        <p className="text-xs text-slate-500">Risk Score</p>
                        <div className="flex items-center justify-center gap-1">
                          {riskIcon(routeResult.riskScore)}
                          <p className={`text-lg font-extrabold ${congestionColor(routeResult.riskScore)}`}>
                            {routeResult.riskScore.toFixed(0)}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Congestion bar */}
                    <div className="mb-2 flex justify-between text-xs text-slate-500">
                      <span>Congestion</span>
                      <span className={`font-bold ${congestionBg(routeResult.congestionLevel)} px-2 py-0.5 rounded-full`}>
                        {routeResult.congestionStatus}
                      </span>
                    </div>
                    <div className="mb-4 h-3 overflow-hidden rounded-full bg-white/60">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${
                          routeResult.congestionLevel >= 75 ? "bg-red-500" :
                          routeResult.congestionLevel >= 40 ? "bg-yellow-500" : "bg-green-500"
                        }`}
                        style={{ width: `${routeResult.congestionLevel}%` }}
                      />
                    </div>

                    {/* AI Suggestion */}
                    <div className="rounded-2xl bg-white/70 p-3">
                      <p className="text-xs text-slate-500">🤖 AI Route Suggestion</p>
                      <p className="mt-1 text-sm font-semibold text-slate-800">{routeResult.suggestion}</p>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex min-h-64 items-center justify-center rounded-3xl border-2 border-dashed border-green-300/60 bg-green-50/40 text-center">
                  <div>
                    <p className="text-3xl">🗺️</p>
                    <p className="mt-3 font-bold text-slate-700">Route Traffic Analyser</p>
                    <p className="mt-1 text-sm text-slate-400">
                      Origin + Destination select කරලා<br />
                      Analyse Route Traffic click කරන්න
                    </p>
                    <p className="mt-2 text-xs text-slate-300">
                      eg: Colombo → Kandy
                    </p>
                  </div>
                </div>
              )}

              {/* History placeholder */}
              <div className="rounded-3xl border border-white/30 bg-white/20 p-5 shadow-xl backdrop-blur-xl">
                <h3 className="mb-3 font-bold text-slate-900 flex items-center gap-2">
                  <History size={16} /> Recent Routes
                </h3>
                <p className="text-xs text-slate-400 text-center py-2">
                  Route analyse කළාම history මෙතැනට add වෙනවා.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}