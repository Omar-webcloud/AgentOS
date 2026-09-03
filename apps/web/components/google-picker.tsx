"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import {
  listGoogleAccounts,
  rememberGoogleAccount,
  setSession,
  type SessionUser,
  type StoredGoogleAccount,
} from "@/lib/auth";
import type { BrainId } from "@/lib/brains";
import { BRAINS } from "@/lib/brains";
import { GoogleG } from "@/components/mark";

const DEMO_ACCOUNTS: StoredGoogleAccount[] = [
  { email: "ada.lovelace@gmail.com", name: "Ada Lovelace" },
  { email: "alex.rivera@gmail.com", name: "Alex Rivera" },
];

export function GooglePicker({
  open,
  brain,
  onClose,
}: {
  open: boolean;
  brain: BrainId | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<"pick" | "other">("pick");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const remembered = typeof window === "undefined" ? [] : listGoogleAccounts();
  const accounts = useMemo(() => {
    const seen = new Set<string>();
    const out: StoredGoogleAccount[] = [];
    for (const a of [...remembered, ...DEMO_ACCOUNTS]) {
      const key = a.email.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(a);
    }
    return out;
  }, [remembered, open]);

  useEffect(() => {
    if (open) {
      setMode("pick");
      setError(null);
      setName("");
      setEmail("");
    }
  }, [open]);

  if (!open) return null;

  const meta = brain ? BRAINS.find((b) => b.id === brain) : null;
  const continueTo = meta ? `AgentOS · ${meta.name}` : "AgentOS";

  async function signIn(account: StoredGoogleAccount) {
    setLoading(true);
    setError(null);
    try {
      const res = await api<{ token: string; user: SessionUser }>("/api/v1/auth/google", {
        method: "POST",
        body: JSON.stringify({
          email: account.email,
          name: account.name,
          picture: account.picture,
          brain: brain ?? undefined,
        }),
      });
      rememberGoogleAccount(account);
      setSession(res.token, res.user);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Google sign-in failed");
      setLoading(false);
    }
  }

  function submitOther(e: React.FormEvent) {
    e.preventDefault();
    if (!email.includes("@")) {
      setError("Enter a Google email");
      return;
    }
    void signIn({ email: email.trim(), name: name.trim() || email.split("@")[0]! });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-[2px]">
      <button className="absolute inset-0 cursor-default" onClick={onClose} aria-label="Close" />
      <div className="relative w-full max-w-[440px] overflow-hidden rounded-3xl bg-white text-[#202124] shadow-2xl">
        <div className="px-8 pb-6 pt-8">
          <div className="flex justify-center">
            <GoogleG className="h-8 w-8" />
          </div>
          <h2 className="mt-5 text-center text-[24px] font-normal tracking-tight">
            {mode === "other" ? "Use another account" : "Choose an account"}
          </h2>
          <p className="mt-1 text-center text-[14px] text-[#5f6368]">
            to continue to <span className="text-[#1a73e8]">{continueTo}</span>
          </p>

          {error && (
            <div className="mt-4 rounded-lg bg-[#fce8e6] px-3 py-2 text-sm text-[#c5221f]">{error}</div>
          )}

          {mode === "pick" ? (
            <ul className="mt-6 divide-y divide-[#e8eaed] border-y border-[#e8eaed]">
              {accounts.map((a) => (
                <li key={a.email}>
                  <button
                    disabled={loading}
                    onClick={() => void signIn(a)}
                    className="flex w-full items-center gap-3 px-1 py-3 text-left hover:bg-[#f8f9fa] disabled:opacity-60"
                  >
                    <Avatar name={a.name} email={a.email} />
                    <span className="min-w-0">
                      <span className="block truncate text-[14px] font-medium">{a.name}</span>
                      <span className="block truncate text-[13px] text-[#5f6368]">{a.email}</span>
                    </span>
                  </button>
                </li>
              ))}
              <li>
                <button
                  disabled={loading}
                  onClick={() => setMode("other")}
                  className="flex w-full items-center gap-3 px-1 py-3 text-left hover:bg-[#f8f9fa]"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-full border border-[#dadce0] text-[#5f6368]">
                    +
                  </span>
                  <span className="text-[14px]">Use another account</span>
                </button>
              </li>
            </ul>
          ) : (
            <form onSubmit={submitOther} className="mt-6 space-y-3">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Name"
                className="w-full rounded-lg border border-[#dadce0] px-3 py-2.5 text-sm outline-none focus:border-[#1a73e8]"
              />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Google email"
                required
                className="w-full rounded-lg border border-[#dadce0] px-3 py-2.5 text-sm outline-none focus:border-[#1a73e8]"
              />
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setMode("pick")} className="px-3 py-2 text-sm text-[#1a73e8]">
                  Back
                </button>
                <button
                  disabled={loading}
                  className="rounded-full bg-[#1a73e8] px-5 py-2 text-sm font-medium text-white disabled:opacity-60"
                >
                  {loading ? "Signing in…" : "Next"}
                </button>
              </div>
            </form>
          )}

          {loading && mode === "pick" && (
            <p className="mt-4 text-center text-sm text-[#5f6368]">Signing in with Google…</p>
          )}

          <p className="mt-6 text-center text-[11px] leading-relaxed text-[#80868b]">
            AgentOS uses Google Sign-In so ChatGPT, Gemini, and Grok can share the same account.
            This demo does not send a Google password — pick an account to create your outline.
          </p>
        </div>
      </div>
    </div>
  );
}

function Avatar({ name, email }: { name: string; email: string }) {
  const initials = name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const hue = [...email].reduce((s, c) => s + c.charCodeAt(0), 0) % 360;
  return (
    <span
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[12px] font-medium text-white"
      style={{ background: `hsl(${hue} 45% 42%)` }}
    >
      {initials}
    </span>
  );
}

export function ContinueWithGoogle({
  brain,
  label,
  onClick,
}: {
  brain?: BrainId;
  label?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-center gap-3 rounded-full border border-[#dadce0] bg-white px-4 py-2.5 text-sm font-medium text-[#3c4043] shadow-sm transition hover:bg-[#f8f9fa]"
    >
      <GoogleG className="h-5 w-5" />
      {label ?? (brain ? `Continue with Google` : "Sign in with Google")}
    </button>
  );
}
