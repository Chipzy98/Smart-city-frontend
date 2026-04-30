"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
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
    <div className="relative h-80 overflow-hidden rounded-3xl border border-white/30 bg-white/20 p-6 shadow-2xl backdrop-blur-xl">
      <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-blue-400/20 blur-2xl" />
      <div className="absolute -bottom-10 -left-10 h-28 w-28 rounded-full bg-green-400/20 blur-2xl" />

      <div className="relative z-10 mb-4">
        <h2 className="text-lg font-bold text-slate-900">Weekly Analytics</h2>
        <p className="text-sm text-slate-500">
          Traffic and energy usage trend
        </p>
      </div>

      <div className="relative z-10 h-[85%]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.25} />
            <XAxis dataKey="day" tick={{ fill: "#64748B", fontSize: 12 }} />
            <YAxis tick={{ fill: "#64748B", fontSize: 12 }} />
            <Tooltip
              contentStyle={{
                borderRadius: "16px",
                border: "1px solid rgba(255,255,255,0.4)",
                background: "rgba(255,255,255,0.85)",
                backdropFilter: "blur(12px)",
              }}
            />
            <Legend />

            <Line
              type="monotone"
              dataKey="traffic"
              name="Traffic"
              stroke="#2563EB"
              strokeWidth={3}
              dot={{ r: 5 }}
              activeDot={{ r: 8 }}
              animationDuration={1400}
            />

            <Line
              type="monotone"
              dataKey="energy"
              name="Energy"
              stroke="#10B981"
              strokeWidth={3}
              dot={{ r: 5 }}
              activeDot={{ r: 8 }}
              animationDuration={1800}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}