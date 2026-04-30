import { Sparkles } from "lucide-react";

export default function InsightCard({ message }: { message: string }) {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/30 bg-white/20 p-5 shadow-2xl backdrop-blur-xl">
      <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-blue-400/20 blur-2xl" />
      <div className="absolute -bottom-10 -left-10 h-28 w-28 rounded-full bg-green-400/20 blur-2xl" />

      <div className="relative z-10">
        <div className="mb-3 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-green-400 text-white shadow-lg">
            <Sparkles size={20} />
          </div>

          <div>
            <h3 className="font-bold text-slate-900">AI Insight</h3>
            <p className="text-xs font-medium text-slate-500">
              Smart recommendation
            </p>
          </div>
        </div>

        <p className="leading-relaxed text-slate-700">{message}</p>
      </div>
    </div>
  );
}