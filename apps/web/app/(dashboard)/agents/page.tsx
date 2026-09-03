"use client";

import { useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { Badge, Empty, ErrorBanner, Spinner } from "@/components/ui";

interface Agent {
  id: string;
  name: string;
  slug: string;
  description: string;
  status: string;
  currentVersionId: string | null;
}

export default function Agents() {
  const { data: agents, error: loadError, loading, reload } = useApi<Agent[]>("/api/v1/agents");
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [seeding, setSeeding] = useState(false);

  function load() {
    setError(null);
    reload();
  }

  /**
   * Recovers an organization that ended up with no agents (created by an older
   * build, or a failed seed). The endpoint is a no-op once agents exist.
   */
  async function seedStarterPortfolio() {
    setSeeding(true);
    setError(null);
    try {
      await api<{ agents: number; tools: number }>("/api/v1/organization/seed", {
        method: "POST",
        body: JSON.stringify({}),
      });
      reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not seed the starter portfolio");
    } finally {
      setSeeding(false);
    }
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      await api<Agent>("/api/v1/agents", {
        method: "POST",
        body: JSON.stringify({ name: name.trim(), description: description.trim() }),
      });
      setName("");
      setDescription("");
      setCreating(false);
      reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create agent");
    } finally {
      setSaving(false);
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
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-100">Agents</h1>
          <p className="mt-0.5 text-sm text-slate-500">Versioned executable AI workers.</p>
        </div>
        <button
          onClick={() => setCreating((v) => !v)}
          className="rounded-lg bg-accent px-3.5 py-2 text-sm font-semibold text-white hover:bg-accent-dim"
        >
          {creating ? "Cancel" : "New agent"}
        </button>
      </div>

      {creating && (
        <form onSubmit={create} className="mt-5 rounded-xl border border-base-700 bg-base-900 p-4">
          <label className="block text-xs font-medium text-slate-400">Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Invoice reconciler"
            autoFocus
            required
            className="mt-1 w-full rounded-lg border border-base-600 bg-base-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-accent"
          />
          <label className="mt-3 block text-xs font-medium text-slate-400">Description</label>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What this agent does"
            className="mt-1 w-full rounded-lg border border-base-600 bg-base-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-accent"
          />
          <button
            disabled={saving}
            className="mt-4 rounded-lg bg-accent px-3.5 py-2 text-sm font-semibold text-white hover:bg-accent-dim disabled:opacity-60"
          >
            {saving ? "Creating…" : "Create agent"}
          </button>
        </form>
      )}

      {(loadError || error) && (
        <ErrorBanner
          message={loadError ?? error ?? "Could not load agents"}
          onRetry={loadError ? reload : undefined}
        />
      )}

      <div className="mt-6">
        {(agents ?? []).length === 0 ? (
          <Empty
            title={loadError ? "Agents unavailable" : "No agents yet"}
            body={
              loadError
                ? "The API request failed — see the error above."
                : "Create your first autonomous worker, or load the starter portfolio (Code Reviewer + Support Agent, with tools and policies)."
            }
            cta={
              loadError ? undefined : (
                <button
                  onClick={seedStarterPortfolio}
                  disabled={seeding}
                  className="rounded-lg border border-base-600 px-3.5 py-2 text-sm font-medium text-slate-200 hover:bg-base-800 disabled:opacity-60"
                >
                  {seeding ? "Seeding…" : "Seed starter agents"}
                </button>
              )
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {(agents ?? []).map((a) => (
              <Link key={a.id} href={`/agents/${a.id}`} className="rounded-xl border border-base-700 bg-base-900/70 p-5 transition-colors hover:border-accent/50">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-slate-100">{a.name}</span>
                  <Badge status={a.status} />
                </div>
                <p className="mt-1.5 line-clamp-2 text-sm text-slate-500">{a.description || "No description"}</p>
                <div className="mono mt-3 text-[11px] text-slate-600">{a.slug}</div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
