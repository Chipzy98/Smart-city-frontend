"use client";

import { useState } from "react";

type User = { name?: string; role?: string } | null;

function readUser(): User {
  if (typeof window === "undefined") return null;
  try {
    const s = localStorage.getItem("user");
    return s ? JSON.parse(s) : null;
  } catch { return null; }
}

export default function Navbar({ title }: { title: string }) {
  // useState lazy initializer runs once on client — no useEffect, no ESLint warning
  const [user] = useState<User>(readUser);

  return (
    <header className="h-16 px-6 flex items-center justify-between bg-gradient-to-r from-[#1E3A8A] via-[#3B82F6] to-[#10B981] text-white shadow-lg backdrop-blur-md">
      <h1 className="text-xl md:text-2xl font-bold tracking-wide">{title}</h1>

      <div className="flex items-center gap-4">
        <div className="text-right hidden sm:block">
          <p className="text-sm font-semibold" suppressHydrationWarning>
            {user?.name || "User"}
          </p>
          <span className="text-xs px-2 py-0.5 rounded-full bg-green-200 text-green-900 font-bold capitalize" suppressHydrationWarning>
            {user?.role || "guest"}
          </span>
        </div>

        <div className="relative">
          <div className="w-10 h-10 rounded-full bg-white text-blue-700 flex items-center justify-center font-bold text-lg shadow-md border-2 border-green-300" suppressHydrationWarning>
            {user?.name?.charAt(0)?.toUpperCase() || "U"}
          </div>
          <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 border-2 border-white rounded-full" />
        </div>
      </div>
    </header>
  );
}