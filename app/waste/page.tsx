"use client";

import { useEffect, useState } from "react";
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

  useEffect(() => {
    getMyWasteRecordsFromApiAsync().then(setRecords);
  }, []);

  const classify = async () => {
    const response = await classifyWasteFromApiAsync({
      imageUrl: "uploads/sample.jpg",
    });

    setResult(response);
  };

  return (
    <DashboardLayout title="Waste Classification">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4">
            AI Waste Classification
          </h2>

          <div className="border-2 border-dashed rounded-xl p-10 text-center text-slate-500 mb-4">
            Image Upload Placeholder
          </div>

          <button
            type="button"
            onClick={classify}
            className="bg-green-600 text-white px-5 py-3 rounded-lg"
          >
            Classify Waste
          </button>

          {result && (
            <div className="mt-5 bg-slate-100 p-4 rounded-lg">
              <p>
                <b>Category:</b> {result.category}
              </p>
              <p>
                <b>Confidence:</b> {result.confidence}
              </p>
              <p>
                <b>CO₂ Saved:</b> {result.co2Saved}
              </p>
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4">My Waste Records</h2>

          <div className="space-y-3 max-h-96 overflow-auto">
            {records.map((item) => (
              <div key={item.id} className="border rounded-lg p-3">
                <p>
                  <b>Category:</b> {item.category}
                </p>
                <p>
                  <b>Confidence:</b> {item.confidence}
                </p>
                <p>
                  <b>CO₂ Saved:</b> {item.co2Saved}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}