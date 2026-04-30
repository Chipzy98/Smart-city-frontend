"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Map,
  Trash2,
  Zap,
  LogOut,
  Leaf,
  type LucideIcon,
} from "lucide-react";

type Role = "admin" | "manager" | "user";

type User = {
  role?: Role;
  name?: string;
};

type MenuItem = {
  name: string;
  path: string;
  icon: LucideIcon;
};

const menus: Record<Role, MenuItem[]> = {
  admin: [
    { name: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
    { name: "Traffic", path: "/traffic", icon: Map },
    { name: "Waste", path: "/waste", icon: Trash2 },
    { name: "Energy", path: "/energy", icon: Zap },
  ],
  manager: [
    { name: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
    { name: "Traffic", path: "/traffic", icon: Map },
    { name: "Waste", path: "/waste", icon: Trash2 },
    { name: "Energy", path: "/energy", icon: Zap },
  ],
  user: [
    { name: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
    { name: "Waste", path: "/waste", icon: Trash2 },
    { name: "Energy", path: "/energy", icon: Zap },
  ],
};

function getUser(): User {
  if (typeof window === "undefined") return { role: "user" };

  try {
    const storedUser = localStorage.getItem("user");
    if (!storedUser) return { role: "user" };

    return JSON.parse(storedUser) as User;
  } catch {
    return { role: "user" };
  }
}

function getUserRole(): Role {
  const user = getUser();

  if (
    user.role === "admin" ||
    user.role === "manager" ||
    user.role === "user"
  ) {
    return user.role;
  }

  return "user";
}

export default function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();

  const user = getUser();
  const role = getUserRole();

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    router.push("/login");
  };

  return (
    <aside className="relative flex min-h-screen w-64 flex-col overflow-hidden bg-gradient-to-b from-[#1E3A8A] via-[#2563EB] to-[#10B981] p-4 text-white shadow-2xl">
      
      {/* Decorative Effects */}
      <div className="absolute -right-12 -top-12 h-36 w-36 rounded-full bg-green-300/20 blur-2xl" />
      <div className="absolute -bottom-16 -left-10 h-40 w-40 rounded-full bg-blue-300/20 blur-2xl" />

      {/* Logo */}
      <div className="relative z-10 mb-8 flex items-center gap-3 rounded-2xl bg-white/10 p-4 backdrop-blur-md">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-[#1E3A8A] shadow-md">
          <Leaf size={24} />
        </div>

        <div>
          <h2 className="text-2xl font-extrabold leading-none">EcoCity</h2>
          <p className="mt-1 text-xs text-green-100">
            Smart Sustainability
          </p>
        </div>
      </div>

      {/* User Info */}
      <div className="relative z-10 mb-6 rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur-md">
        <p className="text-xs text-green-100">Logged in as</p>

        <h3 className="mt-1 text-sm font-bold">
          {user.name || "EcoCity User"}
        </h3>

        <span className="mt-3 inline-flex rounded-full bg-green-200 px-3 py-1 text-xs font-bold capitalize text-[#1E3A8A]">
          {role}
        </span>
      </div>

      {/* Menu */}
      <nav className="relative z-10 flex-1 space-y-2">
        {menus[role].map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.path;

          return (
            <Link
              key={item.path}
              href={item.path}
              className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition-all duration-200 ${
                isActive
                  ? "bg-white text-[#1E3A8A] shadow-lg"
                  : "text-white/90 hover:bg-white/20 hover:text-white"
              }`}
            >
              <Icon
                size={19}
                className={isActive ? "text-[#10B981]" : "text-green-100"}
              />
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