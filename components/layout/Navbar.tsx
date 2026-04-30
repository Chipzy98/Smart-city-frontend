"use client";

export default function Navbar({ title }: { title: string }) {
  const user =
    typeof window !== "undefined"
      ? JSON.parse(localStorage.getItem("user") || "null")
      : null;

  return (
    <header
      className="h-16 px-6 flex items-center justify-between 
      bg-gradient-to-r from-[#1E3A8A] via-[#3B82F6] to-[#10B981] 
      text-white shadow-lg backdrop-blur-md"
    >
      {/* Title */}
      <h1 className="text-xl md:text-2xl font-bold tracking-wide">
        {title}
      </h1>

      {/* User Section */}
      <div className="flex items-center gap-4">
        {/* User Info */}
        <div className="text-right hidden sm:block">
          <p className="text-sm font-semibold">
            {user?.name || "User"}
          </p>

          <span
            className="text-xs px-2 py-0.5 rounded-full 
            bg-green-200 text-green-900 font-bold capitalize"
          >
            {user?.role || "guest"}
          </span>
        </div>

        {/* Avatar */}
        <div className="relative">
          <div
            className="w-10 h-10 rounded-full 
            bg-white text-blue-700 
            flex items-center justify-center 
            font-bold text-lg shadow-md border-2 border-green-300"
          >
            {user?.name?.charAt(0)?.toUpperCase() || "U"}
          </div>

          {/* Online Indicator */}
          <span
            className="absolute bottom-0 right-0 w-3 h-3 
            bg-green-400 border-2 border-white rounded-full"
          ></span>
        </div>
      </div>
    </header>
  );
}