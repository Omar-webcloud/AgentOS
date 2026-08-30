"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { setSession, type SessionUser } from "@/lib/auth";

export default function Register() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await api<{ token: string; user: SessionUser }>("/api/v1/auth/register", {
        method: "POST",
        body: JSON.stringify({ name, email, password }),
      });
      setSession(res.token, res.user);
      router.push("/dashboard");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-base-950 px-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center justify-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-accent text-sm font-bold text-white">A</div>
          <span className="text-lg font-semibold text-slate-100">AgentOS</span>
        </div>
        <form onSubmit={submit} className="rounded-xl border border-base-700 bg-base-900 p-6">
          <h1 className="text-lg font-semibold text-slate-100">Create your workspace</h1>
          <p className="mt-1 text-sm text-slate-500">Start building your first autonomous agent.</p>

          {error && (
            <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
              {error}
            </div>
          )}

          <label className="mt-5 block text-xs font-medium text-slate-400">Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded-lg border border-base-600 bg-base-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-accent"
            required
          />
          <label className="mt-4 block text-xs font-medium text-slate-400">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-lg border border-base-600 bg-base-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-accent"
            required
          />
          <label className="mt-4 block text-xs font-medium text-slate-400">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-lg border border-base-600 bg-base-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-accent"
            required
          />

          <button
            type="submit"
            disabled={loading}
            className="mt-6 w-full rounded-lg bg-accent py-2.5 text-sm font-semibold text-white hover:bg-accent-dim disabled:opacity-60"
          >
            {loading ? "Creating…" : "Create workspace"}
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-slate-500">
          Already have an account?{" "}
          <Link href="/login" className="text-accent hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
