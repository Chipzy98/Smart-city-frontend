"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export default function SimpleLineChart() {
  const data = [
    { day: "Mon", traffic: 45, energy: 120 },
    { day: "Tue", traffic: 60, energy: 140 },
    { day: "Wed", traffic: 75, energy: 160 },
    { day: "Thu", traffic: 55, energy: 130 },
    { day: "Fri", traffic: 85, energy: 180 },
  ];

  return (
    <div className="bg-white rounded-2xl border shadow-sm p-6 h-80">
      <h2 className="text-lg font-semibold mb-4">Weekly Analytics</h2>

      <ResponsiveContainer width="100%" height="85%">
        <LineChart data={data}>
          <XAxis dataKey="day" />
          <YAxis />
          <Tooltip />
          <Line type="monotone" dataKey="traffic" />
          <Line type="monotone" dataKey="energy" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}