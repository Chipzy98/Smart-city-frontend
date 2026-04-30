export default function InsightCard({ message }: { message: string }) {
  return (
    <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5">
      <h3 className="font-semibold text-blue-700 mb-2">AI Insight</h3>
      <p className="text-slate-700">{message}</p>
    </div>
  );
}