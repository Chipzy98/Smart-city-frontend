"use client";

import { useEffect, useState, type ChangeEvent } from "react";
import {
  Car,
  CloudSun,
  CalendarDays,
  Clock,
  Gauge,
  MapPin,
  Route,
  Loader2,
} from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import {
  getLiveTrafficFromApiAsync,
  predictTrafficFromApiAsync,
} from "@/api/smartCityApi";

type TrafficItem = {
  id: string | number;
  latitude: number;
  longitude: number;
  congestionLevel: number;
};

type TrafficPredictionResponse = {
  predictedCongestionLevel: number;
  status: string;
  suggestion: string;
};

type TrafficForm = {
  hour: number;
  day: number;
  weather: number;
  vehicleCount: number;
};

type TrafficField = keyof TrafficForm;

const fieldLabels: Record<TrafficField, string> = {
  hour: "Hour",
  day: "Day",
  weather: "Weather",
  vehicleCount: "Vehicle Count",
};

const fieldIcons: Record<TrafficField, React.ElementType> = {
  hour: Clock,
  day: CalendarDays,
  weather: CloudSun,
  vehicleCount: Car,
};

export default function TrafficPage() {
  const [traffic, setTraffic] = useState<TrafficItem[]>([]);
  const [prediction, setPrediction] =
    useState<TrafficPredictionResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState<TrafficForm>({
    hour: 17,
    day: 5,
    weather: 1,
    vehicleCount: 700,
  });

  useEffect(() => {
    getLiveTrafficFromApiAsync().then(setTraffic);
  }, []);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: Number(value),
    }));
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

  const fields: TrafficField[] = ["hour", "day", "weather", "vehicleCount"];

  return (
    <DashboardLayout title="Traffic Management">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Prediction */}
        <div className="relative overflow-hidden rounded-3xl border border-white/30 bg-white/20 p-6 shadow-2xl backdrop-blur-xl">
          <div className="absolute -right-12 -top-12 h-32 w-32 rounded-full bg-blue-400/20 blur-2xl" />
          <div className="absolute -bottom-12 -left-12 h-32 w-32 rounded-full bg-green-400/20 blur-2xl" />

          <div className="relative z-10">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-green-500 text-white shadow-lg">
                <Route size={24} />
              </div>

              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Traffic Prediction
                </h2>
                <p className="text-sm text-slate-500">
                  Predict congestion using live city factors
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {fields.map((field) => {
                const Icon = fieldIcons[field];

                return (
                  <div key={field}>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      {fieldLabels[field]}
                    </label>

                    <div className="flex items-center gap-3 rounded-2xl border border-white/50 bg-white/60 px-4 py-3 shadow-sm backdrop-blur-md">
                      <Icon size={18} className="text-blue-600" />

                      <input
                        name={field}
                        type="number"
                        value={form[field]}
                        onChange={handleChange}
                        className="w-full bg-transparent text-sm font-semibold text-slate-800 outline-none placeholder:text-slate-400"
                        placeholder={fieldLabels[field]}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              onClick={predict}
              disabled={loading}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-green-500 px-5 py-3 font-bold text-white shadow-lg transition hover:scale-[1.02] hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading && <Loader2 size={18} className="animate-spin" />}
              {loading ? "Predicting..." : "Predict Traffic"}
            </button>

            {prediction && (
              <div className="mt-6 rounded-3xl border border-blue-200/60 bg-blue-50/70 p-5 shadow-lg backdrop-blur-md">
                <div className="mb-3 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-600 text-white">
                    <Gauge size={20} />
                  </div>

                  <div>
                    <p className="text-sm text-slate-500">
                      Predicted Congestion
                    </p>
                    <h3 className="text-2xl font-extrabold text-slate-900">
                      Level {prediction.predictedCongestionLevel}
                    </h3>
                  </div>
                </div>

                <p className="text-sm text-slate-700">
                  <b>Status:</b> {prediction.status}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-slate-700">
                  <b>Suggestion:</b> {prediction.suggestion}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Live Traffic */}
        <div className="relative overflow-hidden rounded-3xl border border-white/30 bg-white/20 p-6 shadow-2xl backdrop-blur-xl">
          <div className="absolute -right-12 -bottom-12 h-32 w-32 rounded-full bg-green-400/20 blur-2xl" />
          <div className="absolute -left-12 -top-12 h-32 w-32 rounded-full bg-blue-400/20 blur-2xl" />

          <div className="relative z-10">
            <div className="mb-6 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Live Traffic Records
                </h2>
                <p className="text-sm text-slate-500">
                  Real-time congestion locations
                </p>
              </div>

              <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700">
                {traffic.length} Records
              </span>
            </div>

            <div className="mb-4 flex h-72 items-center justify-center overflow-hidden rounded-3xl border border-white/50 bg-gradient-to-br from-blue-100/70 to-green-100/70 shadow-inner backdrop-blur-md">
              <div className="text-center">
                <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/70 text-blue-700 shadow-md">
                  <MapPin size={28} />
                </div>
                <p className="font-bold text-slate-800">
                  Google Maps Heatmap Placeholder
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  Connect Google Maps API here
                </p>
              </div>
            </div>

            <div className="max-h-80 space-y-3 overflow-auto pr-1">
              {traffic.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white/50 p-6 text-center text-sm text-slate-500">
                  No live traffic records found.
                </div>
              ) : (
                traffic.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-white/50 bg-white/60 p-4 shadow-sm backdrop-blur-md transition hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                      <div>
                        <p className="text-xs text-slate-500">Latitude</p>
                        <p className="font-bold text-slate-900">
                          {item.latitude}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-slate-500">Longitude</p>
                        <p className="font-bold text-slate-900">
                          {item.longitude}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-slate-500">Congestion</p>
                        <p className="font-bold text-slate-900">
                          Level {item.congestionLevel}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}