"use client";

import { useEffect, useState } from "react";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";

export default function DashboardLayout({
  children,
  title,
}: {
  children: React.ReactNode;
  title: string;
}) {
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("theme");
    setDarkMode(saved === "dark");
  }, []);

  return (
    <div
      className={`flex min-h-screen transition-all duration-300 ${
        darkMode
          ? "bg-gradient-to-br from-slate-950 via-blue-950 to-emerald-950"
          : "bg-gradient-to-br from-blue-50 via-white to-green-50"
      }`}
    >
      {/* Sidebar */}
      <Sidebar />

      {/* Main */}
      <main className="relative flex-1 overflow-hidden">
        {/* Background glow */}
        <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-blue-400/20 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-green-400/20 blur-3xl" />

        {/* Navbar */}
        <Navbar title={title} />

        {/* Content */}
        <section className="relative z-10 p-6">
          <div
            className={`rounded-3xl border p-6 backdrop-blur-xl transition ${
              darkMode
                ? "border-white/10 bg-white/5 text-white shadow-2xl"
                : "border-white/40 bg-white/70 text-gray-900 shadow-xl"
            }`}
          >
            {children}
          </div>
        </section>
      </main>
    </div>
  );
}