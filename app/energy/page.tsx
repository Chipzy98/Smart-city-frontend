"use client";

import { useEffect, useState, type ChangeEvent } from "react";
import { Bolt, Lightbulb, Thermometer, Users, Zap } from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import {
  getMyEnergyUsageFromApiAsync,
  predictEnergyFromApiAsync,
} from "@/api/smartCityApi";

type EnergyUsageItem = {
  id: string | number;
  usageUnits: number;
  temperature: number;
  occupants: number;
};

type EnergyPredictionResponse = {
  predictedBill: number;
  currency: string;
  tip: string;
};

type EnergyForm = {
  usageUnits: number;
  temperature: number;
  occupants: number;
};

type EnergyField = keyof EnergyForm;

const fieldLabels: Record<EnergyField, string> = {
  usageUnits: "Usage Units",
  temperature: "Temperature",
  occupants: "Occupants",
};

const fieldIcons: Record<EnergyField, React.ElementType> = {
  usageUnits: Zap,
  temperature: Thermometer,
  occupants: Users,
};

export default function EnergyPage() {
  const [usage, setUsage] = useState<EnergyUsageItem[]>([]);
  const [prediction, setPrediction] =
    useState<EnergyPredictionResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState<EnergyForm>({
    usageUnits: 180,
    temperature: 32,
    occupants: 4,
  });

  useEffect(() => {
    getMyEnergyUsageFromApiAsync().then(setUsage);
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
      const result = await predictEnergyFromApiAsync(form);
      setPrediction(result);
    } finally {
      setLoading(false);
    }
  };

  const fields: EnergyField[] = ["usageUnits", "temperature", "occupants"];

  return (
    <DashboardLayout title="Energy Management">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Prediction */}
        <div className="relative overflow-hidden rounded-3xl border border-white/30 bg-white/20 p-6 shadow-2xl backdrop-blur-xl">
          <div className="absolute -right-12 -top-12 h-32 w-32 rounded-full bg-blue-400/20 blur-2xl" />
          <div className="absolute -bottom-12 -left-12 h-32 w-32 rounded-full bg-green-400/20 blur-2xl" />

          <div className="relative z-10">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-green-500 text-white shadow-lg">
                <Bolt size={24} />
              </div>

              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Energy Bill Prediction
                </h2>
                <p className="text-sm text-slate-500">
                  Predict your monthly energy cost
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
              className="mt-6 w-full rounded-2xl bg-gradient-to-r from-blue-600 to-green-500 px-5 py-3 font-bold text-white shadow-lg transition hover:scale-[1.02] hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Predicting..." : "Predict Bill"}
            </button>

            {prediction && (
              <div className="mt-6 rounded-3xl border border-green-200/60 bg-green-50/70 p-5 shadow-lg backdrop-blur-md">
                <div className="mb-3 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-green-500 text-white">
                    <Lightbulb size={20} />
                  </div>

                  <div>
                    <p className="text-sm text-slate-500">Predicted Bill</p>
                    <h3 className="text-2xl font-extrabold text-slate-900">
                      {prediction.currency} {prediction.predictedBill}
                    </h3>
                  </div>
                </div>

                <p className="text-sm leading-relaxed text-slate-700">
                  <b>Tip:</b> {prediction.tip}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Usage */}
        <div className="relative overflow-hidden rounded-3xl border border-white/30 bg-white/20 p-6 shadow-2xl backdrop-blur-xl">
          <div className="absolute -right-12 -bottom-12 h-32 w-32 rounded-full bg-green-400/20 blur-2xl" />
          <div className="absolute -left-12 -top-12 h-32 w-32 rounded-full bg-blue-400/20 blur-2xl" />

          <div className="relative z-10">
            <div className="mb-6 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  My Energy Usage
                </h2>
                <p className="text-sm text-slate-500">
                  Recent energy consumption records
                </p>
              </div>

              <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-700">
                {usage.length} Records
              </span>
            </div>

            <div className="max-h-96 space-y-3 overflow-auto pr-1">
              {usage.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white/50 p-6 text-center text-sm text-slate-500">
                  No energy usage records found.
                </div>
              ) : (
                usage.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-white/50 bg-white/60 p-4 shadow-sm backdrop-blur-md transition hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                      <div>
                        <p className="text-xs text-slate-500">Units</p>
                        <p className="font-bold text-slate-900">
                          {item.usageUnits}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-slate-500">Temperature</p>
                        <p className="font-bold text-slate-900">
                          {item.temperature}°C
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-slate-500">Occupants</p>
                        <p className="font-bold text-slate-900">
                          {item.occupants}
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