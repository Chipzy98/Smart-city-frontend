"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, Map, Trash2, Zap,
  LogOut, Leaf, Brain, type LucideIcon,
} from "lucide-react";

type Role = "admin" | "manager" | "user";
type User = { role?: Role; name?: string };
type MenuItem = { name: string; path: string; icon: LucideIcon };

const menus: Record<Role, MenuItem[]> = {
  admin: [
    { name: "Dashboard",   path: "/dashboard",   icon: LayoutDashboard },
    { name: "Traffic",     path: "/traffic",     icon: Map             },
    { name: "Waste",       path: "/waste",       icon: Trash2          },
    { name: "Energy",      path: "/energy",      icon: Zap             },
    { name: "AI Training", path: "/ai-training", icon: Brain           },
  ],
  manager: [
    { name: "Dashboard",   path: "/dashboard",   icon: LayoutDashboard },
    { name: "Traffic",     path: "/traffic",     icon: Map             },
    { name: "Waste",       path: "/waste",       icon: Trash2          },
    { name: "Energy",      path: "/energy",      icon: Zap             },
    { name: "AI Training", path: "/ai-training", icon: Brain           },
  ],
  user: [
    { name: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
    { name: "Traffic",   path: "/traffic",   icon: Map             },
    { name: "Waste",     path: "/waste",     icon: Trash2          },
    { name: "Energy",    path: "/energy",    icon: Zap             },
  ],
};

// All items rendered server-side (admin menu = most items).
// After mount, items not in the real role's menu are hidden via CSS.
const ALL_ITEMS = menus.admin;

// Always render ALL menu items on server + first client paint.
// After hydration, swap to the real role from localStorage.
const DEFAULT_ROLE: Role = "admin"; // render all items → no count mismatch

export default function Sidebar() {
  const router   = useRouter();
  const pathname = usePathname();

  const [mounted, setMounted] = useState(false);
  const [user,    setUser]    = useState<User>({ role: DEFAULT_ROLE, name: "" });

  // Run only on client, after first paint — safe to read localStorage
  useEffect(() => {
    try {
      const s = localStorage.getItem("user");
      if (s) setUser(JSON.parse(s) as User);
    } catch { /* ignore */ }
    setMounted(true);
  }, []);

  const role: Role =
    user.role === "admin" || user.role === "manager" || user.role === "user"
      ? user.role
      : DEFAULT_ROLE;

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    router.push("/login");
  };

  return (
    <aside className="relative flex min-h-screen w-64 flex-col overflow-hidden bg-gradient-to-b from-[#1E3A8A] via-[#2563EB] to-[#10B981] p-4 text-white shadow-2xl">
      <div className="absolute -right-12 -top-12 h-36 w-36 rounded-full bg-green-300/20 blur-2xl" />
      <div className="absolute -bottom-16 -left-10 h-40 w-40 rounded-full bg-blue-300/20 blur-2xl" />

      {/* Logo */}
      <div className="relative z-10 mb-8 flex items-center gap-3 rounded-2xl bg-white/10 p-4 backdrop-blur-md">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-[#1E3A8A] shadow-md">
          <Leaf size={24} />
        </div>
        <div>
          <h2 className="text-2xl font-extrabold leading-none">EcoCity</h2>
          <p className="mt-1 text-xs text-green-100">Smart Sustainability</p>
        </div>
      </div>

      {/* User Info */}
      <div className="relative z-10 mb-6 rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur-md">
        <p className="text-xs text-green-100">Logged in as</p>
        <h3 className="mt-1 text-sm font-bold" suppressHydrationWarning>
          {mounted ? (user.name || "EcoCity User") : "EcoCity User"}
        </h3>
        <span
          className="mt-3 inline-flex rounded-full bg-green-200 px-3 py-1 text-xs font-bold capitalize text-[#1E3A8A]"
          suppressHydrationWarning
        >
          {mounted ? role : DEFAULT_ROLE}
        </span>
      </div>

      {/* Nav — always render ALL items (server safe), hide non-role items after mount */}
      <nav className="relative z-10 flex-1 space-y-2">
        {ALL_ITEMS.map((item) => {
          const Icon      = item.icon;
          const isActive  = pathname === item.path;
          const isVisible = !mounted || menus[role].some((m) => m.path === item.path);
          return (
            <Link
              key={item.path}
              href={item.path}
              className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition-all duration-200 ${
                isActive
                  ? "bg-white text-[#1E3A8A] shadow-lg"
                  : "text-white/90 hover:bg-white/20 hover:text-white"
              } ${isVisible ? "" : "hidden"}`}
            >
              <Icon size={19} className={isActive ? "text-[#10B981]" : "text-green-100"} />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <button
        type="button"
        onClick={logout}
        className="relative z-10 mt-6 flex items-center justify-center gap-3 rounded-2xl bg-white px-4 py-3 text-sm font-bold text-[#1E3A8A] shadow-lg transition hover:bg-red-600 hover:text-white"
      >
        <LogOut size={18} />
        Logout
      </button>
    </aside>
  );
}
