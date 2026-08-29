"use client";

import { useEffect, useState, type ChangeEvent } from "react";
import {
  Bolt, Lightbulb, Thermometer, Users, Zap,
  Loader2, TrendingUp, TrendingDown, Minus,
  BarChart2, RefreshCw,
} from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import {
  getMyEnergyUsageFromApiAsync,
  predictEnergyFromApiAsync,
} from "@/app/api/smartCityApi";

// ── Types ──────────────────────────────────────────────────────────────────

type EnergyUsageItem = {
  energyUsageId: string;
  usageUnits:    number;
  temperature:   number;
  occupants:     number;
  recordedAt:    string;
};

type EnergyPredictionResponse = {
  predictedBill: number;
  currency:      string;
  tip:           string;
};

type EnergyForm = {
  usageUnits:  number;
  temperature: number;
  occupants:   number;
};

// ── Helpers ────────────────────────────────────────────────────────────────

function billLevel(bill: number) {
  if (bill > 80)  return { label: "High",   color: "text-red-600",    bar: "bg-red-500",    badge: "bg-red-100 text-red-700" };
  if (bill > 40)  return { label: "Medium", color: "text-yellow-600", bar: "bg-yellow-500", badge: "bg-yellow-100 text-yellow-700" };
  return           { label: "Low",    color: "text-green-600",  bar: "bg-green-500",  badge: "bg-green-100 text-green-700" };
}

function usageTrend(items: EnergyUsageItem[]) {
  if (items.length < 2) return null;
  const last  = items[0].usageUnits;
  const prev  = items[1].usageUnits;
  const diff  = ((last - prev) / prev) * 100;
  return diff;
}

const weatherHints: Record<string, string> = {
  hot:  "🌡️ High temperature detected — A/C usage likely high.",
  cool: "❄️ Cool weather — heating costs may apply.",
  mild: "✅ Mild weather — optimal energy conditions.",
};

// ── Component ──────────────────────────────────────────────────────────────

export default function EnergyPage() {
  const [usage,      setUsage]      = useState<EnergyUsageItem[]>([]);
  const [prediction, setPrediction] = useState<EnergyPredictionResponse | null>(null);
  const [loading,    setLoading]    = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [tipIndex,   setTipIndex]   = useState(0);

  const [form, setForm] = useState<EnergyForm>({
    usageUnits:  180,
    temperature: 30,
    occupants:   3,
  });

  const fetchUsage = async () => {
    const res  = await getMyEnergyUsageFromApiAsync();
    const data = Array.isArray(res) ? res : (res?.data ?? []);
    setUsage(data);
  };

  const loadUsage = async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    try {
      await fetchUsage();
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void (async () => {
      try {
        await fetchUsage();
      } catch (err) {
        console.error("Failed to load energy usage:", err);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: Number(value) }));
  };

  const predict = async () => {
    try {
      setLoading(true);
      const result = await predictEnergyFromApiAsync(form);
      setPrediction(result);
      setTipIndex(0);
      // Refresh usage list after prediction (saves new record)
      await loadUsage();
    } finally {
      setLoading(false);
    }
  };

  // Derived UI values
  const trend     = usageTrend(usage);
  const level     = prediction ? billLevel(prediction.predictedBill) : null;
  const barPct    = prediction ? Math.min((prediction.predictedBill / 150) * 100, 100) : 0;
  const tempHint  = form.temperature > 32 ? weatherHints.hot
                  : form.temperature < 18 ? weatherHints.cool
                  : weatherHints.mild;

  // Split multi-sentence tip into carousel items
  const tips = prediction?.tip
    ? prediction.tip.split(/(?<=[.!?])\s+/).filter(Boolean)
    : [];

  return (
    <DashboardLayout title="Energy Management">
      <div className="space-y-6">

        {/* ── Stats Bar ── */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[
            {
              label: "Total Records",
              value: usage.length,
              icon:  BarChart2,
              color: "from-blue-600 to-blue-400",
            },
            {
              label: "Avg Usage",
              value: usage.length
                ? `${(usage.reduce((s, u) => s + u.usageUnits, 0) / usage.length).toFixed(0)} kWh`
                : "—",
              icon:  Zap,
              color: "from-yellow-500 to-orange-400",
            },
            {
              label: "Last Usage",
              value: usage[0] ? `${usage[0].usageUnits} kWh` : "—",
              icon:  Bolt,
              color: "from-purple-600 to-purple-400",
            },
            {
              label: "Trend",
              value: trend != null
                ? `${trend > 0 ? "+" : ""}${trend.toFixed(1)}%`
                : "—",
              icon:  trend != null && trend > 0 ? TrendingUp
                   : trend != null && trend < 0 ? TrendingDown
                   : Minus,
              color: trend != null && trend > 0 ? "from-red-500 to-red-400"
                   : trend != null && trend < 0 ? "from-green-600 to-green-400"
                   : "from-slate-400 to-slate-300",
            },
          ].map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="relative overflow-hidden rounded-3xl border border-white/30 bg-white/20 p-5 shadow-xl backdrop-blur-xl">
                <div className="absolute -right-6 -top-6 h-20 w-20 rounded-full bg-white/10 blur-xl" />
                <div className={`mb-3 inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br ${stat.color} text-white shadow`}>
                  <Icon size={18} />
                </div>
                <p className="text-2xl font-extrabold text-slate-900">{stat.value}</p>
                <p className="text-xs text-slate-500">{stat.label}</p>
              </div>
            );
          })}
        </div>

        {/* ── Main: Form + Result ── */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

          {/* Prediction Form */}
          <div className="relative overflow-hidden rounded-3xl border border-white/30 bg-white/20 p-6 shadow-2xl backdrop-blur-xl">
            <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-yellow-300/20 blur-2xl" />
            <div className="absolute -bottom-10 -left-10 h-28 w-28 rounded-full bg-blue-300/20 blur-2xl" />

            <div className="relative z-10">
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-yellow-500 to-orange-400 text-white shadow-lg">
                  <Bolt size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Energy Bill Prediction</h2>
                  <p className="text-sm text-slate-500">AI-powered monthly cost estimate</p>
                </div>
              </div>

              {/* Weather hint */}
              <div className="mb-5 rounded-2xl border border-yellow-200/60 bg-yellow-50/60 px-4 py-2.5 text-sm text-slate-600">
                {tempHint}
              </div>

              <div className="space-y-4">
                {/* Usage Units */}
                <div>
                  <div className="mb-1 flex items-center justify-between">
                    <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                      <Zap size={14} className="text-yellow-500" /> Monthly Usage (kWh)
                    </label>
                    <span className="text-xs font-bold text-yellow-600">{form.usageUnits} kWh</span>
                  </div>
                  <input
                    name="usageUnits" type="range" min={50} max={600} step={10}
                    value={form.usageUnits} onChange={handleChange}
                    className="h-2 w-full cursor-pointer accent-yellow-500"
                  />
                  <div className="mt-1 flex justify-between text-xs text-slate-400">
                    <span>50</span><span>600 kWh</span>
                  </div>
                </div>

                {/* Temperature */}
                <div>
                  <div className="mb-1 flex items-center justify-between">
                    <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                      <Thermometer size={14} className="text-orange-500" /> Avg Temperature (°C)
                    </label>
                    <span className="text-xs font-bold text-orange-600">{form.temperature}°C</span>
                  </div>
                  <input
                    name="temperature" type="range" min={0} max={45} step={1}
                    value={form.temperature} onChange={handleChange}
                    className="h-2 w-full cursor-pointer accent-orange-500"
                  />
                  <div className="mt-1 flex justify-between text-xs text-slate-400">
                    <span>0°C</span><span>45°C</span>
                  </div>
                </div>

                {/* Occupants */}
                <div>
                  <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <Users size={14} className="text-blue-500" /> Number of Occupants
                  </label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5, 6].map((n) => (
                      <button
                        key={n} type="button"
                        onClick={() => setForm((p) => ({ ...p, occupants: n }))}
                        className={`flex h-10 w-10 items-center justify-center rounded-2xl text-sm font-bold transition ${
                          form.occupants === n
                            ? "bg-blue-600 text-white shadow-lg"
                            : "bg-white/70 text-slate-700 hover:bg-blue-50"
                        }`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <button
                type="button" onClick={predict} disabled={loading}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-yellow-500 to-orange-400 py-3 font-bold text-white shadow-lg transition hover:scale-[1.02] disabled:opacity-60"
              >
                {loading && <Loader2 size={18} className="animate-spin" />}
                {loading ? "Predicting…" : "⚡ Predict Energy Bill"}
              </button>
            </div>
          </div>

          {/* Result Panel */}
          <div className="flex flex-col gap-4">

            {prediction && level ? (
              <>
                {/* Bill Card */}
                <div className="relative overflow-hidden rounded-3xl border border-yellow-200/60 bg-gradient-to-br from-yellow-50/80 to-orange-50/80 p-6 shadow-xl backdrop-blur-md">
                  <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-yellow-400/20 blur-xl" />

                  <div className="relative mb-4 flex items-center gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-yellow-500 to-orange-400 text-white shadow-lg">
                      <Lightbulb size={26} />
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">Predicted Monthly Bill</p>
                      <p className={`text-4xl font-extrabold ${level.color}`}>
                        ${prediction.predictedBill.toFixed(2)}
                        <span className="ml-1 text-lg font-semibold text-slate-400">{prediction.currency}</span>
                      </p>
                    </div>
                    <span className={`ml-auto rounded-full px-3 py-1 text-xs font-bold ${level.badge}`}>
                      {level.label} Usage
                    </span>
                  </div>

                  {/* Animated bill meter */}
                  <div className="mb-2 flex items-center justify-between text-xs text-slate-500">
                    <span>$0</span>
                    <span className="font-semibold">Cost Meter</span>
                    <span>$150+</span>
                  </div>
                  <div className="mb-5 h-4 overflow-hidden rounded-full bg-slate-200 shadow-inner">
                    <div
                      className={`h-full rounded-full transition-all duration-1000 ease-out ${level.bar}`}
                      style={{ width: `${barPct}%` }}
                    />
                  </div>

                  {/* Breakdown estimate */}
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: "Base Rate",  value: `$${(form.usageUnits * 0.135).toFixed(2)}` },
                      { label: "Temp Load",  value: form.temperature > 28 ? "+High" : form.temperature < 15 ? "+Med" : "Normal" },
                      { label: "Per Person", value: `$${(form.occupants * 2.5).toFixed(2)}` },
                    ].map((item) => (
                      <div key={item.label} className="rounded-2xl bg-white/70 p-3 text-center">
                        <p className="text-xs text-slate-500">{item.label}</p>
                        <p className="text-sm font-bold text-slate-800">{item.value}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* AI Tips Carousel */}
                <div className="relative overflow-hidden rounded-3xl border border-green-200/60 bg-green-50/70 p-5 shadow-xl backdrop-blur-md">
                  <div className="mb-3 flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-green-500 text-white shadow">
                      <Lightbulb size={18} />
                    </div>
                    <p className="font-bold text-slate-900">💡 AI Energy Saving Tip</p>
                    {tips.length > 1 && (
                      <span className="ml-auto text-xs text-slate-400">{tipIndex + 1} / {tips.length}</span>
                    )}
                  </div>
                  <p className="text-sm leading-relaxed text-slate-700">
                    {tips[tipIndex] ?? prediction.tip}
                  </p>
                  {tips.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setTipIndex((i) => (i + 1) % tips.length)}
                      className="mt-3 text-xs font-semibold text-green-600 underline"
                    >
                      Next tip →
                    </button>
                  )}
                </div>
              </>
            ) : (
              <div className="flex min-h-60 items-center justify-center rounded-3xl border-2 border-dashed border-yellow-300/60 bg-yellow-50/40 text-center">
                <div>
                  <p className="text-4xl">⚡</p>
                  <p className="mt-3 font-bold text-slate-700">Energy Bill Predictor</p>
                  <p className="mt-1 text-sm text-slate-400">
                    Sliders adjust කරලා<br />Predict Energy Bill click කරන්න
                  </p>
                </div>
              </div>
            )}

            {/* Usage History */}
            <div className="relative overflow-hidden rounded-3xl border border-white/30 bg-white/20 p-5 shadow-xl backdrop-blur-xl">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-bold text-slate-900">My Usage History</h3>
                <button
                  type="button" onClick={() => loadUsage(true)}
                  className="flex items-center gap-1 rounded-xl bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-600 transition hover:bg-blue-100"
                >
                  <RefreshCw size={12} className={refreshing ? "animate-spin" : ""} />
                  Refresh
                </button>
              </div>

              <div className="max-h-52 space-y-2 overflow-auto pr-1">
                {usage.length === 0 ? (
                  <p className="py-4 text-center text-sm text-slate-400">
                    No usage records yet. Predict to create records.
                  </p>
                ) : (
                  usage.map((item) => (
                    <div
                      key={item.energyUsageId}
                      className="flex items-center gap-3 rounded-2xl bg-white/60 px-4 py-3 shadow-sm"
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-yellow-100 text-yellow-600">
                        <Zap size={14} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-bold text-slate-800">{item.usageUnits} kWh</p>
                          <p className="text-xs text-slate-400">
                            {new Date(item.recordedAt).toLocaleDateString()}
                          </p>
                        </div>
                        <p className="text-xs text-slate-500">
                          {item.temperature}°C · {item.occupants} occupants
                        </p>
                      </div>
                      {/* Mini bar */}
                      <div className="w-16">
                        <div className="h-1.5 overflow-hidden rounded-full bg-slate-200">
                          <div
                            className="h-full rounded-full bg-yellow-500"
                            style={{ width: `${Math.min((item.usageUnits / 600) * 100, 100)}%` }}
                          />
                        </div>
                      </div>
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