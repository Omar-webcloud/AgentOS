"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { setSession, type SessionUser } from "@/lib/auth";
import { BRAINS, type BrainId } from "@/lib/brains";
import { BrainMark, Mark } from "@/components/mark";
import { ContinueWithGoogle, GooglePicker } from "@/components/google-picker";

export function AuthScreen({ intent = "signin" }: { intent?: "signin" | "signup" }) {
  const router = useRouter();
  const [picker, setPicker] = useState<{ open: boolean; brain: BrainId | null }>({
    open: false,
    brain: null,
  });
  const [emailOpen, setEmailOpen] = useState(false);
  const [email, setEmail] = useState("admin@agentos.dev");
  const [password, setPassword] = useState("demo1234");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function emailLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await api<{ token: string; user: SessionUser }>("/api/v1/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
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
    <main className="relative min-h-screen overflow-hidden bg-base-950 text-slate-200">
      <div className="paper-grain pointer-events-none absolute inset-0 opacity-40" />
      <div className="relative mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
        <Link href="/" className="mb-8 flex items-center justify-center gap-2">
          <Mark className="h-8 w-8" />
          <span className="font-serif text-xl text-paper">AgentOS</span>
        </Link>

        <div className="rounded-3xl border border-base-700 bg-base-900/80 p-6 shadow-xl">
          <h1 className="font-serif text-3xl text-paper">
            {intent === "signup" ? "Start your outline" : "Open your outline"}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-400">
            Sign up with ChatGPT, Gemini, or Grok — using the Google account you already have.
            This app only triggers the agents.
          </p>

          <div className="mt-6 space-y-3">
            {BRAINS.map((b) => (
              <button
                key={b.id}
                onClick={() => setPicker({ open: true, brain: b.id })}
                className="flex w-full items-center gap-3 rounded-2xl border border-base-700 bg-base-950/60 px-4 py-3 text-left transition hover:border-copper/60 hover:bg-base-850"
              >
                <BrainMark id={b.id} className="h-8 w-8" />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-paper">Continue with {b.name}</span>
                  <span className="block text-xs text-slate-500">{b.googleHint}</span>
                </span>
                <span className="text-[10px] uppercase tracking-wider text-slate-600">{b.tag}</span>
              </button>
            ))}
          </div>

          <div className="mt-4">
            <ContinueWithGoogle brain={null} />
          </div>

          <button
            onClick={() => setEmailOpen((v) => !v)}
            className="mt-5 w-full text-center text-xs text-slate-500 hover:text-slate-300"
          >
            {emailOpen ? "Hide email sign-in" : "Use email instead"}
          </button>

          {emailOpen && (
            <form onSubmit={emailLogin} className="mt-4 space-y-3">
              {error && (
                <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                  {error}
                </div>
              )}
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-base-600 bg-base-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-copper"
                required
              />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-base-600 bg-base-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-copper"
                required
              />
              <button
                disabled={loading}
                className="w-full rounded-lg bg-copper py-2.5 text-sm font-semibold text-ink hover:bg-copper-dim disabled:opacity-60"
              >
                {loading ? "Signing in…" : "Sign in"}
              </button>
            </form>
          )}
        </div>

        <p className="mt-6 text-center text-sm text-slate-500">
          {intent === "signup" ? (
            <>
              Already have an outline?{" "}
              <Link href="/login" className="text-copper hover:underline">
                Sign in
              </Link>
            </>
          ) : (
            <>
              New here?{" "}
              <Link href="/register" className="text-copper hover:underline">
                Create one with Google
              </Link>
            </>
          )}
        </p>
      </div>

      <GooglePicker
        open={picker.open}
        brain={picker.brain}
        onClose={() => setPicker({ open: false, brain: null })}
      />
    </main>
  );
}
