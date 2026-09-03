"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { Badge, Empty, ErrorBanner, Spinner } from "@/components/ui";

interface Tool {
  id: string;
  name: string;
  description: string;
  risk: string;
  timeoutMs: number;
  inputSchema: Record<string, unknown>;
  retryPolicy: { attempts: number; strategy: string };
}

export default function Tools() {
  const { data: tools, error, loading, reload } = useApi<Tool[]>("/api/v1/tools");
  const [seeding, setSeeding] = useState(false);
  const [seedError, setSeedError] = useState<string | null>(null);

  /** Recovers an organization whose starter tools were never seeded. */
  async function seedStarterTools() {
    setSeeding(true);
    setSeedError(null);
    try {
      await api("/api/v1/organization/seed", { method: "POST", body: JSON.stringify({}) });
      reload();
    } catch (err) {
      // A 409 means the organization already has agents — the starter set is
      // only offered to empty organizations, so that is not an error here.
      setSeedError(err instanceof Error ? err.message : "Could not seed starter tools");
    } finally {
      setSeeding(false);
    }
  }

  return (
    <div>
      <h1 className="text-xl font-semibold text-slate-100">Tools</h1>
      <p className="mt-0.5 text-sm text-slate-500">
        Capabilities agents can invoke — each with a risk classification and retry policy.
      </p>

      {(error || seedError) && <ErrorBanner message={error ?? seedError!} onRetry={error ? reload : undefined} />}

      {loading ? (
        <div className="flex items-center justify-center py-24 text-sm text-slate-500">
          <Spinner /> <span className="ml-2">Loading…</span>
        </div>
      ) : tools && tools.length > 0 ? (
        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {tools.map((t) => (
            <div key={t.id} className="rounded-xl border border-base-700 bg-base-900/70 p-4">
              <div className="flex items-center justify-between">
                <span className="mono text-sm font-medium text-slate-100">{t.name}</span>
                <Badge status={t.risk} />
              </div>
              <p className="mt-1 text-sm text-slate-500">{t.description}</p>
              <div className="mono mt-3 flex gap-4 text-[11px] text-slate-600">
                <span>timeout {t.timeoutMs}ms</span>
                <span>retries {t.retryPolicy.attempts}</span>
                <span>{t.retryPolicy.strategy}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        !error && (
          <div className="mt-6">
            <Empty
              title="No tools yet"
              body="Tools are seeded automatically when an organization is created. If this is an older organization, load the starter set below."
              cta={
                <button
                  onClick={seedStarterTools}
                  disabled={seeding}
                  className="rounded-lg border border-base-600 px-3.5 py-2 text-sm font-medium text-slate-200 hover:bg-base-800 disabled:opacity-60"
                >
                  {seeding ? "Seeding…" : "Seed starter tools"}
                </button>
              }
            />
          </div>
        )
      )}
    </div>
  );
}
