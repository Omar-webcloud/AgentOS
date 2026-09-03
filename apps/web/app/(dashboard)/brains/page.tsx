"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { ErrorBanner, Spinner } from "@/components/ui";
import { BRAINS, type BrainId } from "@/lib/brains";
import { BrainMark, GoogleG } from "@/components/mark";
import { getUser } from "@/lib/auth";

interface Provider {
  provider: BrainId;
  status: string;
  googleEmail: string;
  connectedAt: string;
}

export default function Brains() {
  const { data, error, loading, reload } = useApi<Provider[]>("/api/v1/providers");
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const user = getUser();
  const connected = new Map((data ?? []).map((p) => [p.provider, p]));

  async function connect(id: BrainId) {
    setBusy(id);
    setErr(null);
    try {
      await api("/api/v1/providers", {
        method: "POST",
        body: JSON.stringify({ provider: id }),
      });
      reload();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not connect");
    } finally {
      setBusy(null);
    }
  }

  async function disconnect(id: BrainId) {
    setBusy(id);
    setErr(null);
    try {
      await api(`/api/v1/providers/${id}`, { method: "DELETE" });
      reload();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not disconnect");
    } finally {
      setBusy(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-sm text-slate-500">
        <Spinner /> <span className="ml-2">Loading…</span>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <p className="text-[11px] font-medium uppercase tracking-[0.25em] text-copper">Google accounts</p>
      <h1 className="font-serif text-4xl text-paper">Brains</h1>
      <p className="mt-2 max-w-lg text-sm leading-relaxed text-slate-500">
        ChatGPT, Gemini, and Grok all sign in with Google. Connect the ones you want to trigger from
        the outline — AgentOS never holds the model, it only fires the task.
      </p>

      {(error || err) && <ErrorBanner message={error ?? err ?? ""} onRetry={error ? reload : undefined} />}

      <div className="mt-8 space-y-4">
        {BRAINS.map((b) => {
          const row = connected.get(b.id);
          const on = row?.status === "connected";
          return (
            <div
              key={b.id}
              className="flex flex-wrap items-center gap-4 rounded-3xl border border-base-700 bg-base-900/70 p-5"
            >
              <BrainMark id={b.id} className="h-10 w-10" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h2 className="font-serif text-xl text-paper">{b.name}</h2>
                  <span className="text-[10px] uppercase tracking-wider text-slate-500">{b.tag}</span>
                </div>
                <p className="mt-0.5 text-sm text-slate-500">{b.blurb}</p>
                {on && (
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-400">
                    <GoogleG className="h-3.5 w-3.5" />
                    {row.googleEmail || user?.email}
                  </p>
                )}
              </div>
              {on ? (
                <button
                  onClick={() => void disconnect(b.id)}
                  disabled={busy === b.id}
                  className="rounded-full border border-base-600 px-4 py-2 text-sm text-slate-300 hover:bg-base-800 disabled:opacity-60"
                >
                  Disconnect
                </button>
              ) : (
                <button
                  onClick={() => void connect(b.id)}
                  disabled={busy === b.id}
                  className="flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-medium text-[#3c4043] hover:bg-slate-100 disabled:opacity-60"
                >
                  <GoogleG className="h-4 w-4" />
                  {busy === b.id ? "Connecting…" : "Connect with Google"}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
