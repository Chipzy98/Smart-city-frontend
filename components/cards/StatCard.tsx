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
    <div className="bg-white rounded-2xl shadow-sm border p-5">
      <p className="text-sm text-slate-500">{title}</p>
      <h2 className="text-3xl font-bold mt-2 text-slate-800">{value}</h2>
      <p className="text-sm text-green-600 mt-2">{subtitle}</p>
    </div>
  );
}