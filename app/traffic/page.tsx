"use client";

import { useEffect, useState, type ChangeEvent } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import {
  getLiveTrafficFromApiAsync,
  predictTrafficFromApiAsync,
} from "@/api/smartCityApi";

// ✅ Types
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

export default function TrafficPage() {
  const [traffic, setTraffic] = useState<TrafficItem[]>([]);
  const [prediction, setPrediction] =
    useState<TrafficPredictionResponse | null>(null);

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
    const result = await predictTrafficFromApiAsync(form);
    setPrediction(result);
  };

  const fields: TrafficField[] = [
    "hour",
    "day",
    "weather",
    "vehicleCount",
  ];

  return (
    <DashboardLayout title="Traffic Management">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Prediction */}
        <div className="bg-white rounded-2xl border shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4">Traffic Prediction</h2>

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
            className="bg-blue-600 text-white px-5 py-3 rounded-lg"
          >
            Predict Traffic
          </button>

          {prediction && (
            <div className="mt-5 bg-slate-100 p-4 rounded-lg">
              <p>
                <b>Level:</b> {prediction.predictedCongestionLevel}
              </p>
              <p>
                <b>Status:</b> {prediction.status}
              </p>
              <p>
                <b>Suggestion:</b> {prediction.suggestion}
              </p>
            </div>
          )}
        </div>

        {/* Live Traffic */}
        <div className="bg-white rounded-2xl border shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4">
            Live Traffic Records
          </h2>

          <div className="h-72 bg-slate-200 rounded-xl flex items-center justify-center mb-4">
            Google Maps Heatmap Placeholder
          </div>

          <div className="space-y-3 max-h-80 overflow-auto">
            {traffic.map((item) => (
              <div key={item.id} className="border rounded-lg p-3">
                <p>Lat: {item.latitude}</p>
                <p>Lng: {item.longitude}</p>
                <p>Congestion: {item.congestionLevel}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}