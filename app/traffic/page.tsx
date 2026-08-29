"use client";

import { useEffect, useState, type ChangeEvent } from "react";
import dynamic from "next/dynamic";
import {
  Car, CloudSun, CalendarDays, Clock,
  Gauge, Route, Loader2, MapPin, Navigation,
} from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import {
  getLiveTrafficFromApiAsync,
  predictTrafficFromApiAsync,
} from "@/api/smartCityApi";
import type { LatLng, TrafficPoint } from "@/components/maps/TrafficMap";

// Dynamic import — Leaflet is browser-only (SSR disable)
const TrafficMap = dynamic(() => import("@/components/maps/TrafficMap"), {
  ssr:     false,
  loading: () => (
    <div className="flex h-[380px] items-center justify-center rounded-3xl bg-slate-100 text-sm text-slate-400">
      Loading map…
    </div>
  ),
});

type TrafficRecord = {
  trafficDataId:   string;
  latitude:        number;
  longitude:       number;
  congestionLevel: number;
  recordedAt:      string;
};

type TrafficPredictionResponse = {
  predictedCongestionLevel: number;
  status:     string;
  suggestion: string;
};

type TrafficForm = {
  hour:         number;
  day:          number;
  weather:      number;
  vehicleCount: number;
};

const weatherOptions = ["Clear ☀️", "Cloudy ⛅", "Rainy 🌧️", "Stormy ⛈️"];
const dayOptions     = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function congestionColor(level: number) {
  if (level >= 75) return "text-red-600";
  if (level >= 40) return "text-yellow-600";
  return "text-green-600";
}

function congestionBadge(level: number) {
  if (level >= 75) return "bg-red-100 text-red-700";
  if (level >= 40) return "bg-yellow-100 text-yellow-700";
  return "bg-green-100 text-green-700";
}

export default function TrafficPage() {
  const [records,    setRecords]    = useState<TrafficRecord[]>([]);
  const [prediction, setPrediction] = useState<TrafficPredictionResponse | null>(null);
  const [loading,    setLoading]    = useState(false);
  const [picked,     setPicked]     = useState<LatLng | null>(null);

  const [form, setForm] = useState<TrafficForm>({
    hour:         new Date().getHours(),
    day:          new Date().getDay(),
    weather:      0,
    vehicleCount: 300,
  });

  useEffect(() => {
    getLiveTrafficFromApiAsync()
      .then((res) => {
        const data = Array.isArray(res) ? res : (res?.data ?? []);
        setRecords(data);
      })
      .catch(console.error);
  }, []);

  const handleLocationPick = (latlng: LatLng) => {
    setPicked(latlng);
    const now = new Date();
    setForm((prev) => ({ ...prev, hour: now.getHours(), day: now.getDay() }));
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: Number(value) }));
  };

  const predict = async () => {
    try {
      setLoading(true);
      const result = await predictTrafficFromApiAsync(form);
      setPrediction(result);
    } finally {
      setLoading(false);
    }
  };

  const trafficPoints: TrafficPoint[] = records.map((r) => ({
    lat:             Number(r.latitude),
    lng:             Number(r.longitude),
    congestionLevel: r.congestionLevel,
  }));

  return (
    <DashboardLayout title="Traffic Management">
      <div className="space-y-6">

        {/* ── Map ── */}
        <div className="relative overflow-hidden rounded-3xl border border-white/30 bg-white/20 p-5 shadow-2xl backdrop-blur-xl">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-green-500 text-white shadow">
              <MapPin size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Live Traffic Map</h2>
              <p className="text-xs text-slate-500">
                Map click කරලා location pick කරන්න → form auto-fill වෙනවා
              </p>
            </div>
            {picked && (
              <span className="ml-auto rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-700">
                📍 {picked.lat.toFixed(4)}, {picked.lng.toFixed(4)}
              </span>
            )}
          </div>

          <TrafficMap
            trafficPoints={trafficPoints}
            onLocationPick={handleLocationPick}
            pickedLocation={picked}
            height="380px"
          />

          {/* Legend */}
          <div className="mt-3 flex items-center gap-4 text-xs text-slate-500">
            <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded-full bg-green-500" /> Low</span>
            <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded-full bg-yellow-500" /> Moderate</span>
            <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded-full bg-red-500" /> High</span>
            <span className="ml-auto flex items-center gap-1"><span className="inline-block h-3 w-3 rounded-full bg-blue-600" /> Selected</span>
          </div>
        </div>

        {/* ── Form + Result ── */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

          {/* Prediction Form */}
          <div className="relative overflow-hidden rounded-3xl border border-white/30 bg-white/20 p-6 shadow-2xl backdrop-blur-xl">
            <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-blue-400/20 blur-2xl" />
            <div className="relative z-10">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-green-500 text-white shadow">
                  <Route size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">AI Traffic Prediction</h2>
                  <p className="text-xs text-slate-500">Map click කළාම auto-fill වෙනවා</p>
                </div>
              </div>

              <div className="space-y-3">
                {/* Hour */}
                <div>
                  <label className="mb-1 flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <Clock size={14} className="text-blue-600" /> Hour of Day
                  </label>
                  <input
                    name="hour" type="number" min={0} max={23}
                    value={form.hour} onChange={handleChange}
                    className="w-full rounded-2xl border border-white/50 bg-white/70 px-4 py-2.5 text-sm font-semibold text-slate-800 outline-none backdrop-blur-md"
                  />
                </div>

                {/* Day */}
                <div>
                  <label className="mb-1 flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <CalendarDays size={14} className="text-blue-600" /> Day of Week
                  </label>
                  <select
                    name="day" value={form.day} onChange={handleChange}
                    className="w-full rounded-2xl border border-white/50 bg-white/70 px-4 py-2.5 text-sm font-semibold text-slate-800 outline-none backdrop-blur-md"
                  >
                    {dayOptions.map((d, i) => <option key={d} value={i}>{d}</option>)}
                  </select>
                </div>

                {/* Weather */}
                <div>
                  <label className="mb-1 flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <CloudSun size={14} className="text-blue-600" /> Weather
                  </label>
                  <select
                    name="weather" value={form.weather} onChange={handleChange}
                    className="w-full rounded-2xl border border-white/50 bg-white/70 px-4 py-2.5 text-sm font-semibold text-slate-800 outline-none backdrop-blur-md"
                  >
                    {weatherOptions.map((w, i) => <option key={w} value={i}>{w}</option>)}
                  </select>
                </div>

                {/* Vehicle Count */}
                <div>
                  <label className="mb-1 flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <Car size={14} className="text-blue-600" /> Vehicle Count
                  </label>
                  <input
                    name="vehicleCount" type="number" min={0}
                    value={form.vehicleCount} onChange={handleChange}
                    className="w-full rounded-2xl border border-white/50 bg-white/70 px-4 py-2.5 text-sm font-semibold text-slate-800 outline-none backdrop-blur-md"
                  />
                </div>
              </div>

              <button
                type="button" onClick={predict} disabled={loading}
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-green-500 py-3 font-bold text-white shadow-lg transition hover:scale-[1.02] disabled:opacity-60"
              >
                {loading && <Loader2 size={18} className="animate-spin" />}
                {loading ? "Predicting…" : "🤖 Predict Traffic"}
              </button>
            </div>
          </div>

          {/* Result + Records */}
          <div className="space-y-4">

            {prediction ? (
              <div className="relative overflow-hidden rounded-3xl border border-blue-200/60 bg-blue-50/70 p-5 shadow-xl backdrop-blur-md">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-600 text-white">
                    <Gauge size={20} />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">AI Prediction Result</p>
                    <h3 className={`text-3xl font-extrabold ${congestionColor(prediction.predictedCongestionLevel)}`}>
                      {prediction.predictedCongestionLevel.toFixed(1)}
                      <span className="text-lg font-semibold text-slate-400"> / 100</span>
                    </h3>
                  </div>
                  <span className={`ml-auto rounded-full px-3 py-1 text-xs font-bold ${congestionBadge(prediction.predictedCongestionLevel)}`}>
                    {prediction.status}
                  </span>
                </div>

                {/* Progress bar */}
                <div className="mb-4 h-3 overflow-hidden rounded-full bg-slate-200">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${
                      prediction.predictedCongestionLevel >= 75 ? "bg-red-500" :
                      prediction.predictedCongestionLevel >= 40 ? "bg-yellow-500" : "bg-green-500"
                    }`}
                    style={{ width: `${prediction.predictedCongestionLevel}%` }}
                  />
                </div>

                <div className="rounded-2xl bg-white/70 p-3">
                  <p className="text-xs text-slate-500">💡 AI Suggestion</p>
                  <p className="mt-1 text-sm font-semibold text-slate-800">{prediction.suggestion}</p>
                </div>

                {picked && (
                  <div className="mt-3 flex items-center gap-2 rounded-2xl bg-white/70 p-3">
                    <Navigation size={14} className="text-blue-600" />
                    <p className="text-xs text-slate-600">
                      Location: <span className="font-bold">{picked.lat.toFixed(5)}, {picked.lng.toFixed(5)}</span>
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex min-h-40 items-center justify-center rounded-3xl border-2 border-dashed border-blue-300/60 bg-blue-50/40 text-center">
                <div>
                  <p className="text-2xl">🚦</p>
                  <p className="mt-2 text-sm text-slate-500">
                    Map click කරලා location pick කරන්න<br />
                    හෝ form fill කරලා predict කරන්න
                  </p>
                </div>
              </div>
            )}

            {/* Live Records */}
            <div className="relative overflow-hidden rounded-3xl border border-white/30 bg-white/20 p-5 shadow-xl backdrop-blur-xl">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-bold text-slate-900">Live Records</h3>
                <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700">
                  {records.length} points
                </span>
              </div>
              <div className="max-h-56 space-y-2 overflow-auto pr-1">
                {records.length === 0 ? (
                  <p className="py-4 text-center text-sm text-slate-500">No records found.</p>
                ) : (
                  records.map((r) => (
                    <div
                      key={r.trafficDataId}
                      className="flex items-center justify-between rounded-2xl bg-white/60 px-4 py-2.5 text-sm shadow-sm"
                    >
                      <span className="text-slate-600">
                        📍 {Number(r.latitude).toFixed(4)}, {Number(r.longitude).toFixed(4)}
                      </span>
                      <span className={`font-bold ${congestionColor(r.congestionLevel)}`}>
                        {r.congestionLevel.toFixed(0)}%
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}