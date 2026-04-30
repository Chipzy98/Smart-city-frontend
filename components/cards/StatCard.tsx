import { TrendingUp } from "lucide-react";

export default function StatCard({
  title,
  value,
  subtitle,
}: {
  title: string;
  value: string | number;
  subtitle: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/30 bg-white/20 p-5 shadow-2xl backdrop-blur-xl transition hover:-translate-y-1 hover:shadow-xl">
      
      {/* Glow Effects */}
      <div className="absolute -top-10 -right-10 h-24 w-24 rounded-full bg-blue-400/20 blur-2xl" />
      <div className="absolute -bottom-10 -left-10 h-24 w-24 rounded-full bg-green-400/20 blur-2xl" />

      <div className="relative z-10">
        {/* Title */}
        <p className="text-sm font-medium text-slate-500">{title}</p>

        {/* Value */}
        <h2 className="mt-2 text-3xl font-bold text-slate-900">
          {value}
        </h2>

        {/* Subtitle */}
        <div className="mt-3 flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-green-500/20 text-green-600">
            <TrendingUp size={14} />
          </span>

          <p className="text-sm font-medium text-green-600">
            {subtitle}
          </p>
        </div>
      </div>
    </div>
  );
}