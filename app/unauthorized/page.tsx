import Link from "next/link";

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100">
      <div className="bg-white rounded-2xl shadow p-8 text-center">
        <h1 className="text-3xl font-bold text-red-600 mb-3">Unauthorized</h1>

        <p className="text-slate-600 mb-5">
          You do not have permission to access this page.
        </p>

        <Link
          href="/login"
          className="bg-blue-600 text-white px-5 py-3 rounded-lg"
        >
          Back to Login
        </Link>
      </div>
    </div>
  );
}