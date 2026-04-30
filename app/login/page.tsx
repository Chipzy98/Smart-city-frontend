"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import Link from "next/link";
import { Leaf, Lock, Mail, Loader2 } from "lucide-react";

type LoginForm = {
  email: string;
  password: string;
};

export default function LoginPage() {
  const router = useRouter();

  const [form, setForm] = useState<LoginForm>({
    email: "",
    password: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleLogin = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    try {
      setLoading(true);
      setError("");

      const res = await axios.post(
        "http://localhost:5000/api/auth/login",
        form
      );

      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user", JSON.stringify(res.data.user));

      router.push("/dashboard");
    } catch {
      setError("Login failed. Please check your email and password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-blue-950 via-blue-700 to-emerald-500 px-4">
      <div className="absolute -left-24 -top-24 h-80 w-80 rounded-full bg-green-300/20 blur-3xl" />
      <div className="absolute -bottom-24 -right-24 h-80 w-80 rounded-full bg-blue-300/20 blur-3xl" />

      <form
        onSubmit={handleLogin}
        className="relative z-10 w-full max-w-md overflow-hidden rounded-3xl border border-white/30 bg-white/20 p-8 text-white shadow-2xl backdrop-blur-xl"
      >
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-blue-700 shadow-lg">
            <Leaf size={26} />
          </div>

          <div>
            <h1 className="text-3xl font-extrabold">Welcome Back</h1>
            <p className="text-sm text-blue-50">Login to EcoCity Dashboard</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-2xl border border-red-200/40 bg-red-500/20 px-4 py-3 text-sm text-white">
            {error}
          </div>
        )}

        <div className="mb-4 flex items-center gap-3 rounded-2xl border border-white/40 bg-white/20 px-4 py-3 backdrop-blur-md">
          <Mail size={18} className="text-green-100" />
          <input
            name="email"
            type="email"
            placeholder="Email"
            className="w-full bg-transparent text-sm font-medium text-white outline-none placeholder:text-blue-100"
            onChange={handleChange}
            required
          />
        </div>

        <div className="mb-5 flex items-center gap-3 rounded-2xl border border-white/40 bg-white/20 px-4 py-3 backdrop-blur-md">
          <Lock size={18} className="text-green-100" />
          <input
            name="password"
            type="password"
            placeholder="Password"
            className="w-full bg-transparent text-sm font-medium text-white outline-none placeholder:text-blue-100"
            onChange={handleChange}
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 font-bold text-blue-700 shadow-lg transition hover:scale-[1.02] hover:bg-green-100 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {loading && <Loader2 size={18} className="animate-spin" />}
          {loading ? "Logging in..." : "Login"}
        </button>

        <p className="mt-6 text-center text-sm text-blue-50">
          No account?{" "}
          <Link href="/register" className="font-bold text-white underline">
            Register
          </Link>
        </p>
      </form>
    </div>
  );
}