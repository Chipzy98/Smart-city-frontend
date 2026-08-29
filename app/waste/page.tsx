"use client";

import {
  useEffect, useState, useRef, useCallback,
  type ChangeEvent, type DragEvent,
} from "react";
import {
  Recycle, Leaf, Sparkles, Loader2, BadgeCheck,
  AlertTriangle, Package, Wind, RefreshCw, TrendingUp,
  UploadCloud, Link as LinkIcon, X, ImagePlus,
} from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import {
  classifyWasteFromApiAsync,
  getMyWasteRecordsFromApiAsync,
} from "@/api/smartCityApi";

// ── Types ──────────────────────────────────────────────────────────────────

type WasteRecord = {
  wasteRecordId:   string;
  imageUrl:        string;
  category:        string;
  confidence:      number;
  co2Saved:        number;
  createdDateTime: string;
};

type WasteClassifyResult = {
  wasteRecordId: string;
  category:      string;
  confidence:    number;
  co2Saved:      number;
  message:       string;
};

type InputMode = "upload" | "url";

// ── Category config ────────────────────────────────────────────────────────

const categoryConfig: Record<string, {
  label:  string;
  icon:   React.ElementType;
  color:  string;
  bg:     string;
  border: string;
  tip:    string;
}> = {
  recyclable: {
    label:  "Recyclable ♻️",
    icon:   Recycle,
    color:  "text-blue-700",
    bg:     "bg-blue-50",
    border: "border-blue-200",
    tip:    "Clean and sort before placing in recycling bin.",
  },
  organic: {
    label:  "Organic 🌱",
    icon:   Leaf,
    color:  "text-green-700",
    bg:     "bg-green-50",
    border: "border-green-200",
    tip:    "Place in compost bin or organic waste collection.",
  },
  hazardous: {
    label:  "Hazardous ⚠️",
    icon:   AlertTriangle,
    color:  "text-red-700",
    bg:     "bg-red-50",
    border: "border-red-200",
    tip:    "Take to a certified hazardous waste disposal center.",
  },
  general: {
    label:  "General Waste 🗑️",
    icon:   Package,
    color:  "text-slate-700",
    bg:     "bg-slate-50",
    border: "border-slate-200",
    tip:    "Place in general waste bin for landfill collection.",
  },
};

const confidencePct = (v: number) =>
  v <= 1 ? `${(v * 100).toFixed(0)}%` : `${Number(v).toFixed(0)}%`;

const MAX_FILE_MB = 5;

// ── Component ──────────────────────────────────────────────────────────────

export default function WastePage() {
  const [records,    setRecords]    = useState<WasteRecord[]>([]);
  const [result,     setResult]     = useState<WasteClassifyResult | null>(null);
  const [loading,    setLoading]    = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Input mode: drag-drop/browse OR URL
  const [inputMode,  setInputMode]  = useState<InputMode>("upload");

  // Upload state
  const [dragging,   setDragging]   = useState(false);
  const [previewSrc, setPreviewSrc] = useState<string | null>(null); // base64 or URL
  const [fileName,   setFileName]   = useState<string>("");
  const [fileError,  setFileError]  = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // URL state
  const [imageUrl,  setImageUrl]  = useState("");
  const [imgError,  setImgError]  = useState(false);
  const [urlError,  setUrlError]  = useState("");

  // ── Data fetch ─────────────────────────────────────────────────────────

  const fetchRecords = async () => {
    const res  = await getMyWasteRecordsFromApiAsync();
    const data = Array.isArray(res) ? res : (res?.data ?? []);
    setRecords(data);
  };

  const loadRecords = async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    try { await fetchRecords(); }
    finally { setRefreshing(false); }
  };

  useEffect(() => {
    void (async () => {
      try { await fetchRecords(); }
      catch (err) { console.error("Failed to load waste records:", err); }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── File handling helpers ──────────────────────────────────────────────

  const processFile = useCallback((file: File) => {
    setFileError("");
    setResult(null);

    if (!file.type.startsWith("image/")) {
      setFileError("Image file එකක් select කරන්න (JPG, PNG, WEBP).");
      return;
    }
    if (file.size > MAX_FILE_MB * 1024 * 1024) {
      setFileError(`File size ${MAX_FILE_MB}MB ට අඩු විය යුතුයි.`);
      return;
    }

    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (e) => setPreviewSrc(e.target?.result as string ?? null);
    reader.readAsDataURL(file);
  }, []);

  // ── Drag & Drop handlers ───────────────────────────────────────────────

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  // ── Browse handler ─────────────────────────────────────────────────────

  const handleBrowse = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  // ── Clear selection ────────────────────────────────────────────────────

  const clearImage = () => {
    setPreviewSrc(null);
    setFileName("");
    setFileError("");
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // ── Classify ───────────────────────────────────────────────────────────

  const classify = async () => {
    let urlToSend = "";

    if (inputMode === "upload") {
      if (!previewSrc) { setFileError("Image upload/drop කරන්න."); return; }
      // base64 data URL directly — backend WasteAIService handles it as hint
      // For real vision: upload to storage and get URL; here we use filename hint
      urlToSend = fileName || "uploaded-image.jpg";
    } else {
      if (!imageUrl.trim()) { setUrlError("Image URL enter කරන්න."); return; }
      setUrlError("");
      urlToSend = imageUrl;
    }

    try {
      setLoading(true);
      const response = await classifyWasteFromApiAsync({ imageUrl: urlToSend });
      setResult(response);
      await loadRecords();
    } finally {
      setLoading(false);
    }
  };

  // ── Tab switch ─────────────────────────────────────────────────────────

  const switchMode = (mode: InputMode) => {
    setInputMode(mode);
    setResult(null);
    setFileError("");
    setUrlError("");
  };

  // Quick URL examples
  const examples = [
    { label: "Plastic bottle", url: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3e/Plastic_bottle.jpg/320px-Plastic_bottle.jpg" },
    { label: "Banana peel",    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8a/Banana-Yolk.jpg/320px-Banana-Yolk.jpg" },
    { label: "Old battery",    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/89/AA_Batteries.jpg/320px-AA_Batteries.jpg" },
  ];

  // Derived values
  const totalCo2  = records.reduce((s, r) => s + r.co2Saved, 0);
  const catCounts = records.reduce<Record<string, number>>((acc, r) => {
    acc[r.category] = (acc[r.category] ?? 0) + 1;
    return acc;
  }, {});
  const cfg = result ? (categoryConfig[result.category] ?? categoryConfig.general) : null;

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <DashboardLayout title="Waste Classification">
      <div className="space-y-6">

        {/* ── Impact Stats ── */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[
            { label: "Total Classified", value: records.length,          icon: Recycle, color: "from-green-600 to-emerald-400" },
            { label: "CO₂ Saved (kg)",   value: totalCo2.toFixed(2),     icon: Wind,    color: "from-blue-600 to-cyan-400" },
            { label: "Recyclable",        value: catCounts.recyclable ?? 0, icon: Recycle, color: "from-blue-500 to-blue-400" },
            { label: "Organic",           value: catCounts.organic ?? 0,    icon: Leaf,    color: "from-green-500 to-green-400" },
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

        {/* ── Main: Classify + Result ── */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

          {/* ── Classification Panel ── */}
          <div className="relative overflow-hidden rounded-3xl border border-white/30 bg-white/20 p-6 shadow-2xl backdrop-blur-xl">
            <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-green-400/20 blur-2xl" />
            <div className="absolute -bottom-10 -left-10 h-28 w-28 rounded-full bg-blue-400/20 blur-2xl" />

            <div className="relative z-10">
              {/* Header */}
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-green-500 to-blue-600 text-white shadow-lg">
                  <Recycle size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">AI Waste Classifier</h2>
                  <p className="text-sm text-slate-500">Image upload කරන්න හෝ URL paste කරන්න</p>
                </div>
              </div>

              {/* ── Tab Switch ── */}
              <div className="mb-5 flex rounded-2xl border border-white/50 bg-white/40 p-1">
                <button
                  type="button"
                  onClick={() => switchMode("upload")}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2 text-sm font-semibold transition ${
                    inputMode === "upload"
                      ? "bg-gradient-to-r from-green-500 to-blue-600 text-white shadow"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <ImagePlus size={15} /> Upload / Drag & Drop
                </button>
                <button
                  type="button"
                  onClick={() => switchMode("url")}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2 text-sm font-semibold transition ${
                    inputMode === "url"
                      ? "bg-gradient-to-r from-green-500 to-blue-600 text-white shadow"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <LinkIcon size={15} /> Image URL
                </button>
              </div>

              {/* ── Upload Tab ── */}
              {inputMode === "upload" && (
                <>
                  {/* Drag & Drop Zone */}
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => !previewSrc && fileInputRef.current?.click()}
                    className={`relative mb-4 flex min-h-52 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-3xl border-2 border-dashed transition-all duration-200 ${
                      dragging
                        ? "border-green-500 bg-green-50 scale-[1.01]"
                        : previewSrc
                          ? "border-green-400 bg-white/60"
                          : "border-green-300/70 bg-white/40 hover:border-green-400 hover:bg-green-50/50"
                    }`}
                  >
                    {previewSrc ? (
                      <>
                        {/* Preview image */}
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={previewSrc}
                          alt="Waste preview"
                          className="max-h-48 w-full object-contain"
                        />
                        {/* Clear button */}
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); clearImage(); }}
                          className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-red-500 text-white shadow hover:bg-red-600"
                        >
                          <X size={14} />
                        </button>
                        {/* Filename badge */}
                        <div className="absolute bottom-3 left-3 rounded-xl bg-black/50 px-3 py-1 text-xs text-white">
                          {fileName}
                        </div>
                      </>
                    ) : (
                      <div className="text-center px-4">
                        <div className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-green-500 to-blue-600 text-white shadow-lg transition-transform duration-200 ${dragging ? "scale-110" : ""}`}>
                          <UploadCloud size={30} />
                        </div>
                        <p className="font-bold text-slate-700">
                          {dragging ? "Drop කරන්න! 🎯" : "Drag & Drop Image Here"}
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          හෝ{" "}
                          <span className="font-semibold text-green-600 underline">
                            browse කරන්න
                          </span>
                        </p>
                        <p className="mt-2 text-xs text-slate-400">
                          JPG, PNG, WEBP · Max {MAX_FILE_MB}MB
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Hidden file input */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleBrowse}
                  />

                  {fileError && (
                    <p className="mb-3 rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-600">
                      ⚠️ {fileError}
                    </p>
                  )}

                  {/* Browse button (alternative) */}
                  {!previewSrc && (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="mb-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-green-300 bg-green-50 py-2.5 text-sm font-semibold text-green-700 transition hover:bg-green-100"
                    >
                      <ImagePlus size={16} /> Browse Files
                    </button>
                  )}
                </>
              )}

              {/* ── URL Tab ── */}
              {inputMode === "url" && (
                <>
                  <div className="mb-4">
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      Waste Item Image URL
                    </label>
                    <div className="flex items-center gap-2 rounded-2xl border border-white/50 bg-white/70 px-4 py-3 backdrop-blur-md focus-within:ring-2 focus-within:ring-green-400">
                      <LinkIcon size={16} className="shrink-0 text-green-600" />
                      <input
                        type="url"
                        value={imageUrl}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => {
                          setImageUrl(e.target.value);
                          setImgError(false);
                          setUrlError("");
                          setResult(null);
                        }}
                        placeholder="https://example.com/waste-image.jpg"
                        className="w-full bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400"
                      />
                      {imageUrl && (
                        <button type="button" onClick={() => { setImageUrl(""); setImgError(false); }}>
                          <X size={14} className="text-slate-400 hover:text-red-500" />
                        </button>
                      )}
                    </div>
                    {urlError && <p className="mt-1 text-xs text-red-500">{urlError}</p>}
                  </div>

                  {/* Quick examples */}
                  <div className="mb-4">
                    <p className="mb-2 text-xs font-semibold text-slate-500">Quick examples:</p>
                    <div className="flex flex-wrap gap-2">
                      {examples.map((ex) => (
                        <button
                          key={ex.label}
                          type="button"
                          onClick={() => { setImageUrl(ex.url); setImgError(false); setResult(null); }}
                          className="rounded-xl border border-green-200 bg-green-50 px-3 py-1.5 text-xs font-semibold text-green-700 transition hover:bg-green-100"
                        >
                          {ex.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* URL preview */}
                  <div className="mb-4 flex min-h-40 items-center justify-center overflow-hidden rounded-3xl border-2 border-dashed border-green-300/70 bg-white/50">
                    {imageUrl && !imgError ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={imageUrl}
                        alt="Preview"
                        className="max-h-40 w-full object-contain"
                        onError={() => setImgError(true)}
                      />
                    ) : (
                      <div className="text-center">
                        <p className="text-2xl">🖼️</p>
                        <p className="mt-2 text-xs text-slate-400">
                          {imgError ? "❌ Image load නොවුණා" : "URL enter කළාම preview දිස්වෙනවා"}
                        </p>
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* ── Classify Button ── */}
              <button
                type="button"
                onClick={classify}
                disabled={loading || (inputMode === "upload" ? !previewSrc : !imageUrl.trim())}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-green-500 to-blue-600 py-3 font-bold text-white shadow-lg transition hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading && <Loader2 size={18} className="animate-spin" />}
                {loading ? "Classifying…" : "🤖 Classify Waste"}
              </button>
            </div>
          </div>

          {/* ── Result + History ── */}
          <div className="flex flex-col gap-4">

            {result && cfg ? (
              <>
                {/* Result Card */}
                <div className={`relative overflow-hidden rounded-3xl border p-6 shadow-xl backdrop-blur-md ${cfg.bg} ${cfg.border}`}>
                  <div className="mb-5 flex items-center gap-4">
                    <div className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-lg ${cfg.color}`}>
                      <cfg.icon size={26} />
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">AI Classification</p>
                      <h3 className={`text-2xl font-extrabold capitalize ${cfg.color}`}>{cfg.label}</h3>
                    </div>
                    <div className="ml-auto text-right">
                      <p className="text-xs text-slate-500">Confidence</p>
                      <p className={`text-2xl font-extrabold ${cfg.color}`}>{confidencePct(result.confidence)}</p>
                    </div>
                  </div>

                  {/* Confidence bar */}
                  <div className="mb-4 h-3 overflow-hidden rounded-full bg-white/60">
                    <div
                      className="h-full rounded-full transition-all duration-1000"
                      style={{
                        width: confidencePct(result.confidence),
                        backgroundColor:
                          result.category === "recyclable" ? "#3b82f6"
                          : result.category === "organic"  ? "#22c55e"
                          : result.category === "hazardous"? "#ef4444"
                          : "#94a3b8",
                      }}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-2xl bg-white/70 p-4 text-center">
                      <p className="text-xs text-slate-500">CO₂ Saved</p>
                      <p className={`text-2xl font-extrabold ${cfg.color}`}>{result.co2Saved} kg</p>
                      <div className="mt-1 flex items-center justify-center gap-1 text-xs text-green-600">
                        <TrendingUp size={12} /> Environmental Impact
                      </div>
                    </div>
                    <div className="rounded-2xl bg-white/70 p-4">
                      <p className="mb-1 text-xs text-slate-500">♻️ Disposal Tip</p>
                      <p className="text-xs font-semibold leading-relaxed text-slate-700">{cfg.tip}</p>
                    </div>
                  </div>
                </div>

                {/* Sustainability message */}
                <div className="flex items-center gap-3 rounded-3xl border border-green-200/60 bg-green-50/70 p-4 shadow">
                  <Sparkles size={20} className="text-green-600" />
                  <p className="text-sm text-slate-700">
                    <span className="font-bold">Great job!</span> Correctly classifying this waste saves{" "}
                    <span className="font-bold text-green-700">{result.co2Saved} kg CO₂</span> from entering the atmosphere.
                  </p>
                </div>
              </>
            ) : (
              <div className="flex min-h-60 items-center justify-center rounded-3xl border-2 border-dashed border-green-300/60 bg-green-50/40 text-center">
                <div>
                  <p className="text-4xl">♻️</p>
                  <p className="mt-3 font-bold text-slate-700">Waste Classifier Ready</p>
                  <p className="mt-1 text-sm text-slate-400">
                    Image drag & drop කරන්න<br />හෝ URL enter කරලා classify කරන්න
                  </p>
                </div>
              </div>
            )}

            {/* History */}
            <div className="relative overflow-hidden rounded-3xl border border-white/30 bg-white/20 p-5 shadow-xl backdrop-blur-xl">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-bold text-slate-900">Classification History</h3>
                <button
                  type="button"
                  onClick={() => loadRecords(true)}
                  className="flex items-center gap-1 rounded-xl bg-green-50 px-3 py-1.5 text-xs font-semibold text-green-600 transition hover:bg-green-100"
                >
                  <RefreshCw size={12} className={refreshing ? "animate-spin" : ""} />
                  Refresh
                </button>
              </div>

              <div className="max-h-52 space-y-2 overflow-auto pr-1">
                {records.length === 0 ? (
                  <p className="py-4 text-center text-sm text-slate-400">
                    No classifications yet.
                  </p>
                ) : (
                  records.map((item) => {
                    const c    = categoryConfig[item.category] ?? categoryConfig.general;
                    const CIcon = c.icon;
                    return (
                      <div key={item.wasteRecordId} className="flex items-center gap-3 rounded-2xl bg-white/60 px-4 py-3 shadow-sm">
                        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${c.bg} ${c.color}`}>
                          <CIcon size={14} />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <p className={`text-sm font-bold capitalize ${c.color}`}>{item.category}</p>
                            <p className="text-xs text-slate-400">
                              {new Date(item.createdDateTime).toLocaleDateString()}
                            </p>
                          </div>
                          <p className="text-xs text-slate-500">
                            {confidencePct(item.confidence)} confidence · {item.co2Saved} kg CO₂
                          </p>
                        </div>
                        <BadgeCheck size={16} className="shrink-0 text-green-500" />
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}