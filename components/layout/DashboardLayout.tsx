"use client";

import Sidebar from "./Sidebar";
import Navbar from "./Navbar";
import { useLocalStorage } from "@/hooks/useLocalStorage";

export default function DashboardLayout({
  children,
  title,
}: {
  children: React.ReactNode;
  title: string;
}) {
  // ── FIX ──────────────────────────────────────────────────────────────────
  // Original code read localStorage inside a useState initializer, which
  // caused a hydration mismatch (server returns false, client returns real
  // value) and can't be fixed with useEffect + setState without triggering
  // the react-hooks/set-state-in-effect lint rule.
  //
  // useSyncExternalStore solves both: the server snapshot is always null
  // (so SSR and hydration agree), and the client snapshot reads the live
  // localStorage value immediately after hydration — no effect, no cascade.
  // ─────────────────────────────────────────────────────────────────────────
  const raw      = useLocalStorage("theme");
  const darkMode = raw === "dark";

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