"use client";

import { useState, useRef, type ChangeEvent } from "react";
import {
  Upload, FileText, CheckCircle2, XCircle,
  Loader2, Brain, TrendingUp, Zap, Trash2, Car,
} from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout";

type Module = "traffic" | "energy" | "waste";

type TrainingResult = {
  module:   Module;
  rows:     number;
  status:   "success" | "error";
  message:  string;
  preview:  string[][];
};

// CSV column definitions per module
const moduleConfig: Record<Module, {
  label:    string;
  icon:     React.ElementType;
  color:    string;
  columns:  string[];
  example:  string;
}> = {
  traffic: {
    label:   "Traffic Data",
    icon:    Car,
    color:   "from-blue-600 to-blue-400",
    columns: ["hour", "day", "weather", "vehicleCount", "congestionLevel"],
    example: "hour,day,weather,vehicleCount,congestionLevel\n8,1,0,520,72\n17,5,2,850,91\n23,0,1,120,15",
  },
  energy: {
    label:   "Energy Data",
    icon:    Zap,
    color:   "from-yellow-500 to-orange-400",
    columns: ["usageUnits", "temperature", "occupants", "predictedBill"],
    example: "usageUnits,temperature,occupants,predictedBill\n210,32,4,38.5\n150,28,2,25.1\n380,35,6,68.2",
  },
  waste: {
    label:   "Waste Data",
    icon:    Trash2,
    color:   "from-green-600 to-emerald-400",
    columns: ["imageUrl", "category", "confidence", "co2Saved"],
    example: "imageUrl,category,confidence,co2Saved\nhttps://ex.com/bottle.jpg,recyclable,0.92,1.8\nhttps://ex.com/banana.jpg,organic,0.88,0.7",
  },
};

function parseCSV(text: string): string[][] {
  return text
    .trim()
    .split("\n")
    .map((line) => line.split(",").map((cell) => cell.trim()));
}

export default function AITrainingPage() {
  const [activeModule, setActiveModule] = useState<Module>("traffic");
  const [result,       setResult]       = useState<TrainingResult | null>(null);
  const [loading,      setLoading]      = useState(false);
  const [csvText,      setCsvText]      = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const config = moduleConfig[activeModule];
  const Icon   = config.icon;

  // ── File upload ────────────────────────────────────────────────────────
  const handleFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      setCsvText((ev.target?.result as string) ?? "");
      setResult(null);
    };
    reader.readAsText(file);
  };

  // ── Train ──────────────────────────────────────────────────────────────
  const handleTrain = async () => {
    if (!csvText.trim()) return;

    setLoading(true);
    setResult(null);

    try {
      const rows    = parseCSV(csvText);
      const headers = rows[0];
      const data    = rows.slice(1).filter((r) => r.length === headers.length);

      // Validate required columns
      const required = config.columns;
      const missing  = required.filter((c) => !headers.includes(c));

      if (missing.length > 0) {
        setResult({
          module:  activeModule,
          rows:    0,
          status:  "error",
          message: `Missing columns: ${missing.join(", ")}`,
          preview: [],
        });
        return;
      }

      // Send to backend AI training endpoint
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:7071"}/api/smartcity/ai/train`,
        {
          method:  "POST",
          headers: {
            "Content-Type":  "application/json",
            Authorization:   token ? `Bearer ${token}` : "",
          },
          body: JSON.stringify({
            module: activeModule,
            headers,
            data,
          }),
        }
      );

      if (!response.ok) throw new Error(`Server error: ${response.status}`);

      setResult({
        module:  activeModule,
        rows:    data.length,
        status:  "success",
        message: `${data.length} rows successfully sent for ${config.label} AI training.`,
        preview: [headers, ...data.slice(0, 5)],
      });
    } catch (err) {
      setResult({
        module:  activeModule,
        rows:    0,
        status:  "error",
        message: err instanceof Error ? err.message : "Training failed.",
        preview: [],
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setCsvText("");
    setResult(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <DashboardLayout title="AI Training">
      <div className="space-y-6">

        {/* Header */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#1E3A8A]/90 via-[#2563EB]/90 to-[#10B981]/90 p-6 text-white shadow-2xl">
          <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
          <div className="relative flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 backdrop-blur">
              <Brain size={28} />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold">AI Model Training</h1>
              <p className="text-sm text-blue-100">
                CSV file upload කරලා Traffic, Energy, Waste AI models train කරන්න
              </p>
            </div>
          </div>
        </div>

        {/* Module Selector */}
        <div className="grid grid-cols-3 gap-4">
          {(Object.entries(moduleConfig) as [Module, typeof moduleConfig[Module]][]).map(
            ([key, cfg]) => {
              const MIcon = cfg.icon;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => { setActiveModule(key); handleReset(); }}
                  className={`flex items-center gap-3 rounded-2xl p-4 font-bold text-white shadow-lg transition hover:scale-[1.02] bg-gradient-to-br ${cfg.color} ${
                    activeModule === key
                      ? "ring-4 ring-offset-2 ring-blue-400"
                      : "opacity-70"
                  }`}
                >
                  <MIcon size={22} />
                  <span className="text-sm">{cfg.label}</span>
                </button>
              );
            }
          )}
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

          {/* Upload Panel */}
          <div className="relative overflow-hidden rounded-3xl border border-white/30 bg-white/20 p-6 shadow-2xl backdrop-blur-xl">
            <div className="mb-5 flex items-center gap-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br ${config.color} text-white shadow`}>
                <Icon size={20} />
              </div>
              <div>
                <h2 className="font-bold text-slate-900">{config.label} CSV Upload</h2>
                <p className="text-xs text-slate-500">Required columns: {config.columns.join(", ")}</p>
              </div>
            </div>

            {/* File Drop Zone */}
            <label className="mb-4 flex min-h-32 cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed border-blue-300/70 bg-white/50 p-6 text-center transition hover:border-blue-500 hover:bg-blue-50/50">
              <Upload size={28} className="mb-2 text-blue-500" />
              <p className="font-semibold text-slate-700">CSV file click කරලා upload කරන්න</p>
              <p className="mt-1 text-xs text-slate-500">හෝ paste කරන්න below</p>
              <input
                ref={fileRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={handleFile}
              />
            </label>

            {/* CSV Textarea */}
            <div className="mb-4">
              <label className="mb-1 block text-xs font-semibold text-slate-600">
                CSV Data (manual paste)
              </label>
              <textarea
                value={csvText}
                onChange={(e) => { setCsvText(e.target.value); setResult(null); }}
                rows={6}
                placeholder={config.example}
                className="w-full rounded-2xl border border-white/50 bg-white/70 px-4 py-3 font-mono text-xs text-slate-700 outline-none backdrop-blur-md placeholder:text-slate-300"
              />
            </div>

            {/* Example download */}
            <button
              type="button"
              onClick={() => {
                const blob = new Blob([config.example], { type: "text/csv" });
                const url  = URL.createObjectURL(blob);
                const a    = document.createElement("a");
                a.href     = url;
                a.download = `${activeModule}_example.csv`;
                a.click();
                URL.revokeObjectURL(url);
              }}
              className="mb-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-blue-300 bg-blue-50 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-100"
            >
              <FileText size={16} /> Example CSV Download කරන්න
            </button>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleTrain}
                disabled={loading || !csvText.trim()}
                className={`flex flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r ${config.color} py-3 font-bold text-white shadow-lg transition hover:scale-[1.02] disabled:opacity-50`}
              >
                {loading ? <Loader2 size={18} className="animate-spin" /> : <TrendingUp size={18} />}
                {loading ? "Training…" : "Train AI"}
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="rounded-2xl border border-slate-200 bg-white/60 px-4 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-100"
              >
                Reset
              </button>
            </div>
          </div>

          {/* Result Panel */}
          <div className="relative overflow-hidden rounded-3xl border border-white/30 bg-white/20 p-6 shadow-2xl backdrop-blur-xl">
            <h2 className="mb-4 font-bold text-slate-900">Training Result</h2>

            {!result && !loading && (
              <div className="flex min-h-60 flex-col items-center justify-center text-center">
                <Brain size={40} className="mb-3 text-slate-300" />
                <p className="text-sm text-slate-400">
                  CSV upload කරලා click කරන්න
                </p>
              </div>
            )}

            {loading && (
              <div className="flex min-h-60 flex-col items-center justify-center gap-3 text-center">
                <Loader2 size={36} className="animate-spin text-blue-500" />
                <p className="font-semibold text-slate-600">AI model training…</p>
                <p className="text-xs text-slate-400">Data processing වෙනවා</p>
              </div>
            )}

            {result && !loading && (
              <div className="space-y-4">
                {/* Status */}
                <div className={`flex items-center gap-3 rounded-2xl p-4 ${
                  result.status === "success"
                    ? "bg-green-50 border border-green-200"
                    : "bg-red-50 border border-red-200"
                }`}>
                  {result.status === "success"
                    ? <CheckCircle2 size={24} className="text-green-600" />
                    : <XCircle     size={24} className="text-red-600" />
                  }
                  <div>
                    <p className={`font-bold ${result.status === "success" ? "text-green-700" : "text-red-700"}`}>
                      {result.status === "success" ? "Training Successful!" : "Training Failed"}
                    </p>
                    <p className="text-sm text-slate-600">{result.message}</p>
                  </div>
                </div>

                {/* Stats */}
                {result.status === "success" && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-2xl bg-white/70 p-4 text-center">
                      <p className="text-2xl font-extrabold text-blue-700">{result.rows}</p>
                      <p className="text-xs text-slate-500">Rows Processed</p>
                    </div>
                    <div className="rounded-2xl bg-white/70 p-4 text-center">
                      <p className="text-2xl font-extrabold text-green-700 capitalize">{result.module}</p>
                      <p className="text-xs text-slate-500">Module</p>
                    </div>
                  </div>
                )}

                {/* Preview Table */}
                {result.preview.length > 0 && (
                  <div>
                    <p className="mb-2 text-xs font-semibold text-slate-600">Data Preview (first 5 rows)</p>
                    <div className="overflow-x-auto rounded-2xl border border-white/50 bg-white/60">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-slate-200 bg-slate-50/80">
                            {result.preview[0].map((h) => (
                              <th key={h} className="px-3 py-2 text-left font-bold text-slate-700">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {result.preview.slice(1).map((row, i) => (
                            <tr key={i} className="border-b border-slate-100 hover:bg-blue-50/40">
                              {row.map((cell, j) => (
                                <td key={j} className="px-3 py-2 text-slate-600">{cell}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}