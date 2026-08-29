"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import Link from "next/link";
import { Leaf, Lock, Mail, User, ShieldCheck, Loader2 } from "lucide-react";

type Role = "user" | "manager" | "admin";

type RegisterForm = {
  name: string;
  email: string;
  password: string;
  role: Role;
};

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:7261";

export default function RegisterPage() {
  const router = useRouter();

  const [form, setForm] = useState<RegisterForm>({
    name: "",
    email: "",
    password: "",
    role: "user",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value as Role }));
  };

  const handleRegister = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError("");

      const res = await axios.post(`${BACKEND}/api/auth/register`, form);

      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user", JSON.stringify(res.data.user));

      router.push("/dashboard");
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.data?.error) {
        setError(err.response.data.error);
      } else {
        setError("Registration failed. Please check your details.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-blue-950 via-blue-700 to-emerald-500 px-4">
      <div className="absolute -left-24 -top-24 h-80 w-80 rounded-full bg-green-300/20 blur-3xl" />
      <div className="absolute -bottom-24 -right-24 h-80 w-80 rounded-full bg-blue-300/20 blur-3xl" />

      <form
        onSubmit={handleRegister}
        className="relative z-10 w-full max-w-md overflow-hidden rounded-3xl border border-white/30 bg-white/20 p-8 text-white shadow-2xl backdrop-blur-xl"
      >
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-blue-700 shadow-lg">
            <Leaf size={26} />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold">Create Account</h1>
            <p className="text-sm text-blue-50">Join EcoCity Dashboard</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-2xl border border-red-200/40 bg-red-500/20 px-4 py-3 text-sm text-white">
            {error}
          </div>
        )}

        <div className="mb-4 flex items-center gap-3 rounded-2xl border border-white/40 bg-white/20 px-4 py-3 backdrop-blur-md">
          <User size={18} className="text-green-100" />
          <input
            name="name"
            placeholder="Full Name"
            className="w-full bg-transparent text-sm font-medium text-white outline-none placeholder:text-blue-100"
            onChange={handleChange}
            required
          />
        </div>

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

        <div className="mb-4 flex items-center gap-3 rounded-2xl border border-white/40 bg-white/20 px-4 py-3 backdrop-blur-md">
          <Lock size={18} className="text-green-100" />
          <input
            name="password"
            type="password"
            placeholder="Password (min 6 characters)"
            minLength={6}
            className="w-full bg-transparent text-sm font-medium text-white outline-none placeholder:text-blue-100"
            onChange={handleChange}
            required
          />
        </div>

        <div className="mb-5 flex items-center gap-3 rounded-2xl border border-white/40 bg-white/20 px-4 py-3 backdrop-blur-md">
          <ShieldCheck size={18} className="text-green-100" />
          <select
            name="role"
            className="w-full bg-transparent text-sm font-medium text-white outline-none"
            onChange={handleChange}
            value={form.role}
          >
            <option className="text-slate-900" value="user">User</option>
            <option className="text-slate-900" value="manager">Manager</option>
            <option className="text-slate-900" value="admin">Admin</option>
          </select>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 font-bold text-blue-700 shadow-lg transition hover:scale-[1.02] hover:bg-green-100 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {loading && <Loader2 size={18} className="animate-spin" />}
          {loading ? "Creating account..." : "Register"}
        </button>

        <p className="mt-6 text-center text-sm text-blue-50">
          Already have account?{" "}
          <Link href="/login" className="font-bold text-white underline">
            Login
          </Link>
        </p>
      </form>
    </div>
  );
}