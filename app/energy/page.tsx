"use client";

import { useEffect, useState, type ChangeEvent } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import {
  getMyEnergyUsageFromApiAsync,
  predictEnergyFromApiAsync,
} from "@/api/smartCityApi";

// ✅ Types
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

export default function EnergyPage() {
  const [usage, setUsage] = useState<EnergyUsageItem[]>([]);
  const [prediction, setPrediction] =
    useState<EnergyPredictionResponse | null>(null);

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
    const result = await predictEnergyFromApiAsync(form);
    setPrediction(result);
  };

  const fields: EnergyField[] = [
    "usageUnits",
    "temperature",
    "occupants",
  ];

  return (
    <DashboardLayout title="Energy Management">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Prediction */}
        <div className="bg-white rounded-2xl border shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4">
            Energy Bill Prediction
          </h2>

          {fields.map((field) => (
            <input
              key={field}
              name={field}
              type="number"
              value={form[field]}
              onChange={handleChange}
              className="w-full border p-3 rounded mb-3"
              placeholder={field}
            />
          ))}

          <button
            onClick={predict}
            className="bg-yellow-500 text-white px-5 py-3 rounded-lg"
          >
            Predict Bill
          </button>

          {prediction && (
            <div className="mt-5 bg-slate-100 p-4 rounded-lg">
              <p>
                <b>Bill:</b> {prediction.currency}{" "}
                {prediction.predictedBill}
              </p>
              <p>
                <b>Tip:</b> {prediction.tip}
              </p>
            </div>
          )}
        </div>

        {/* Usage */}
        <div className="bg-white rounded-2xl border shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4">
            My Energy Usage
          </h2>

          <div className="space-y-3 max-h-96 overflow-auto">
            {usage.map((item) => (
              <div key={item.id} className="border rounded-lg p-3">
                <p>
                  <b>Units:</b> {item.usageUnits}
                </p>
                <p>
                  <b>Temperature:</b> {item.temperature}
                </p>
                <p>
                  <b>Occupants:</b> {item.occupants}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}