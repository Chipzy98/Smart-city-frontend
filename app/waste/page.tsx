"use client";

import { useEffect, useState } from "react";
import {
  UploadCloud,
  Recycle,
  Leaf,
  Sparkles,
  Loader2,
  BadgeCheck,
} from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import {
  classifyWasteFromApiAsync,
  getMyWasteRecordsFromApiAsync,
} from "@/api/smartCityApi";

type WasteRecord = {
  id: string | number;
  category: string;
  confidence: number;
  co2Saved: number;
};

type WasteClassifyResult = {
  category: string;
  confidence: number;
  co2Saved: number;
};

export default function WastePage() {
  const [records, setRecords] = useState<WasteRecord[]>([]);
  const [result, setResult] = useState<WasteClassifyResult | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getMyWasteRecordsFromApiAsync().then(setRecords);
  }, []);

  const classify = async () => {
    try {
      setLoading(true);

      const response = await classifyWasteFromApiAsync({
        imageUrl: "uploads/sample.jpg",
      });

      setResult(response);
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout title="Waste Classification">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Classification */}
        <div className="relative overflow-hidden rounded-3xl border border-white/30 bg-white/20 p-6 shadow-2xl backdrop-blur-xl">
          <div className="absolute -right-12 -top-12 h-32 w-32 rounded-full bg-green-400/20 blur-2xl" />
          <div className="absolute -bottom-12 -left-12 h-32 w-32 rounded-full bg-blue-400/20 blur-2xl" />

          <div className="relative z-10">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-green-500 to-blue-600 text-white shadow-lg">
                <Recycle size={24} />
              </div>

              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  AI Waste Classification
                </h2>
                <p className="text-sm text-slate-500">
                  Classify waste and calculate CO₂ savings
                </p>
              </div>
            </div>

            <div className="mb-5 flex min-h-56 items-center justify-center rounded-3xl border-2 border-dashed border-green-300/70 bg-white/40 p-8 text-center shadow-inner backdrop-blur-md">
              <div>
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-green-500 to-blue-600 text-white shadow-lg">
                  <UploadCloud size={30} />
                </div>

                <p className="font-bold text-slate-800">
                  Image Upload Placeholder
                </p>

                <p className="mt-2 text-sm text-slate-500">
                  Upload plastic, paper, glass, food waste, or metal images here.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={classify}
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-green-500 to-blue-600 px-5 py-3 font-bold text-white shadow-lg transition hover:scale-[1.02] hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading && <Loader2 size={18} className="animate-spin" />}
              {loading ? "Classifying..." : "Classify Waste"}
            </button>

            {result && (
              <div className="mt-6 rounded-3xl border border-green-200/60 bg-green-50/70 p-5 shadow-lg backdrop-blur-md">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-green-500 text-white">
                    <Sparkles size={20} />
                  </div>

                  <div>
                    <p className="text-sm text-slate-500">Classification</p>
                    <h3 className="text-2xl font-extrabold text-slate-900">
                      {result.category}
                    </h3>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl bg-white/70 p-4">
                    <p className="text-xs text-slate-500">Confidence</p>
                    <p className="text-lg font-bold text-blue-700">
                      {result.confidence}%
                    </p>
                  </div>

                  <div className="rounded-2xl bg-white/70 p-4">
                    <p className="text-xs text-slate-500">CO₂ Saved</p>
                    <p className="text-lg font-bold text-green-700">
                      {result.co2Saved} kg
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Records */}
        <div className="relative overflow-hidden rounded-3xl border border-white/30 bg-white/20 p-6 shadow-2xl backdrop-blur-xl">
          <div className="absolute -right-12 -bottom-12 h-32 w-32 rounded-full bg-blue-400/20 blur-2xl" />
          <div className="absolute -left-12 -top-12 h-32 w-32 rounded-full bg-green-400/20 blur-2xl" />

          <div className="relative z-10">
            <div className="mb-6 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  My Waste Records
                </h2>
                <p className="text-sm text-slate-500">
                  Your recent classification history
                </p>
              </div>

              <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700">
                {records.length} Records
              </span>
            </div>

            <div className="max-h-96 space-y-3 overflow-auto pr-1">
              {records.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white/50 p-6 text-center text-sm text-slate-500">
                  No waste records found.
                </div>
              ) : (
                records.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-white/50 bg-white/60 p-4 shadow-sm backdrop-blur-md transition hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <div className="mb-3 flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-green-500/20 text-green-700">
                        <BadgeCheck size={20} />
                      </div>

                      <div>
                        <p className="text-xs text-slate-500">Category</p>
                        <p className="font-bold text-slate-900">
                          {item.category}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div>
                        <p className="text-xs text-slate-500">Confidence</p>
                        <p className="font-bold text-blue-700">
                          {item.confidence}%
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-slate-500">CO₂ Saved</p>
                        <p className="font-bold text-green-700">
                          {item.co2Saved} kg
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="mt-6 rounded-3xl border border-green-200/60 bg-green-50/70 p-5 backdrop-blur-md">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-green-500 text-white">
                  <Leaf size={22} />
                </div>

                <div>
                  <p className="text-sm font-bold text-slate-900">
                    Sustainability Impact
                  </p>
                  <p className="text-sm text-slate-600">
                    Every correct classification helps reduce environmental
                    waste.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}