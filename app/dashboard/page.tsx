"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import StatCard from "@/components/cards/StatCard";
import InsightCard from "@/components/cards/InsightCard";
import SimpleLineChart from "@/components/charts/SimpleLineChart";
import {
  getAdminDashboardFromApiAsync,
  getManagerDashboardFromApiAsync,
  getUserDashboardFromApiAsync,
} from "@/app/api/smartCityApi";

type Role = "admin" | "manager" | "user";

type User = {
  role?: Role;
};

type DashboardData = {
  totalUsers?: number;
  totalTrafficRecords?: number;
  totalWasteRecords?: number;
  totalWaste?: number;
  totalEnergyRecords?: number;
  totalEnergyUsage?: number;
};

function getUserRole(): Role {
  if (typeof window === "undefined") return "user";

  try {
    const storedUser = localStorage.getItem("user");

    if (!storedUser) return "user";

    const user = JSON.parse(storedUser) as User;

    if (
      user.role === "admin" ||
      user.role === "manager" ||
      user.role === "user"
    ) {
      return user.role;
    }

    return "user";
  } catch {
    return "user";
  }
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);

  // Initialize role directly instead of setting it inside useEffect
  const [role] = useState<Role>(() => getUserRole());

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Initialize dark mode directly from localStorage
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;

    const savedTheme = localStorage.getItem("theme");
    return savedTheme === "dark";
  });

  // Save theme whenever darkMode changes
  useEffect(() => {
    localStorage.setItem("theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  // Load dashboard data
  useEffect(() => {
    const loadDashboard = async () => {
      try {
        setLoading(true);
        setError("");

        let result: DashboardData;

        if (role === "admin") {
          result = await getAdminDashboardFromApiAsync();
        } else if (role === "manager") {
          result = await getManagerDashboardFromApiAsync();
        } else {
          result = await getUserDashboardFromApiAsync();
        }

        setData(result);
      } catch {
        setData(null);
        setError("Dashboard data could not be loaded. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    void loadDashboard();
  }, [role]);

  const totalWasteValue = data?.totalWasteRecords ?? data?.totalWaste ?? 0;

  const totalEnergyValue =
    data?.totalEnergyRecords ?? data?.totalEnergyUsage ?? 0;

  const glassCard = darkMode
    ? "border-white/10 bg-white/10 text-white shadow-2xl backdrop-blur-xl"
    : "border-white/60 bg-white/70 text-gray-900 shadow-xl backdrop-blur-xl";

  return (
    <DashboardLayout title="Smart City Dashboard">
      <div
        className={`min-h-screen rounded-3xl p-4 transition-all duration-300 md:p-6 ${
          darkMode
            ? "bg-linear-to-br from-slate-950 via-blue-950 to-emerald-950"
            : "bg-linear-to-br from-blue-50 via-white to-green-50"
        }`}
      >
        {/* Header */}
        <div className="mb-8 overflow-hidden rounded-3xl border border-white/20 bg-linear-to-r from-[#1E3A8A]/90 via-[#2563EB]/90 to-[#10B981]/90 p-6 text-white shadow-2xl backdrop-blur-xl">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="mb-2 text-sm font-medium text-green-100">
                Welcome back
              </p>

              <h1 className="text-2xl font-bold md:text-4xl">
                Smart City & Sustainability Overview
              </h1>

              <p className="mt-2 max-w-2xl text-sm text-blue-50 md:text-base">
                Monitor traffic, waste, energy usage, and key city insights from
                one premium dashboard.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="rounded-2xl border border-white/30 bg-white/20 px-5 py-3 text-center backdrop-blur-md">
                <p className="text-xs uppercase tracking-wide text-green-100">
                  Current Role
                </p>

                <p className="text-lg font-bold capitalize">{role}</p>
              </div>

              <button
                type="button"
                onClick={() => setDarkMode((prev) => !prev)}
                className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/30 bg-white/20 text-white shadow-lg backdrop-blur-md transition hover:bg-white/30"
                title="Toggle dark mode"
              >
                {darkMode ? <Sun size={21} /> : <Moon size={21} />}
              </button>
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 rounded-2xl border border-red-300/40 bg-red-500/10 px-5 py-4 text-sm font-medium text-red-400 backdrop-blur-xl">
            {error}
          </div>
        )}

        {/* Loading */}
        {loading ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
            {[1, 2, 3, 4].map((item) => (
              <div
                key={item}
                className={`h-36 animate-pulse rounded-3xl border ${glassCard}`}
              />
            ))}
          </div>
        ) : (
          <>
            {/* Stats */}
            <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
              <div className={`rounded-3xl border p-1 ${glassCard}`}>
                <StatCard
                  title="Users"
                  value={data?.totalUsers ?? 0}
                  subtitle="Registered users"
                />
              </div>

              <div className={`rounded-3xl border p-1 ${glassCard}`}>
                <StatCard
                  title="Traffic"
                  value={data?.totalTrafficRecords ?? 0}
                  subtitle="Traffic records"
                />
              </div>

              <div className={`rounded-3xl border p-1 ${glassCard}`}>
                <StatCard
                  title="Waste"
                  value={totalWasteValue}
                  subtitle="Waste records"
                />
              </div>

              <div className={`rounded-3xl border p-1 ${glassCard}`}>
                <StatCard
                  title="Energy"
                  value={totalEnergyValue}
                  subtitle="Energy data"
                />
              </div>
            </div>

            {/* Quick Summary */}
            <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
              <div
                className={`rounded-3xl border p-6 transition hover:-translate-y-1 ${glassCard}`}
              >
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/20 text-2xl">
                  🚦
                </div>

                <h3 className="text-lg font-bold">Traffic Monitoring</h3>

                <p
                  className={`mt-2 text-sm ${
                    darkMode ? "text-blue-100" : "text-gray-600"
                  }`}
                >
                  Track congestion records and identify high traffic periods.
                </p>
              </div>

              <div
                className={`rounded-3xl border p-6 transition hover:-translate-y-1 ${glassCard}`}
              >
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-green-500/20 text-2xl">
                  ♻️
                </div>

                <h3 className="text-lg font-bold">Waste Insights</h3>

                <p
                  className={`mt-2 text-sm ${
                    darkMode ? "text-green-100" : "text-gray-600"
                  }`}
                >
                  Analyze waste collection data and sustainability performance.
                </p>
              </div>

              <div
                className={`rounded-3xl border p-6 transition hover:-translate-y-1 ${glassCard}`}
              >
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-500/20 text-2xl">
                  ⚡
                </div>

                <h3 className="text-lg font-bold">Energy Usage</h3>

                <p
                  className={`mt-2 text-sm ${
                    darkMode ? "text-teal-100" : "text-gray-600"
                  }`}
                >
                  View energy records and understand consumption patterns.
                </p>
              </div>
            </div>

            {/* Chart and Insight */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div className={`rounded-3xl border p-5 ${glassCard}`}>
                <div className="mb-4">
                  <h2 className="text-xl font-bold">City Activity Trend</h2>

                  <p
                    className={`text-sm ${
                      darkMode ? "text-blue-100" : "text-gray-500"
                    }`}
                  >
                    Overview of smart city data performance
                  </p>
                </div>

                <SimpleLineChart />
              </div>

              <div className={`rounded-3xl border p-5 ${glassCard}`}>
                <div className="mb-4">
                  <h2
                    className={`text-xl font-bold ${
                      darkMode ? "text-green-200" : "text-[#1E3A8A]"
                    }`}
                  >
                    AI Insight
                  </h2>

                  <p
                    className={`text-sm ${
                      darkMode ? "text-green-100" : "text-gray-500"
                    }`}
                  >
                    Smart recommendation for better city planning
                  </p>
                </div>

                <InsightCard message="Traffic congestion is expected to peak around 5 PM. Consider suggesting alternative routes and increasing public transport visibility during peak hours." />
              </div>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}