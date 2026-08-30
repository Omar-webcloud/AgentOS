"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, fmtUsd, fmtMs, timeAgo } from "@/lib/api";
import { Badge, Empty, Spinner } from "@/components/ui";

interface RunSummary {
  id: string;
  agentName: string;
  status: string;
  triggerType: string;
  estimatedCostUsd: number;
  tokenUsage: number;
  durationMs: number | null;
  createdAt: string;
  error: string | null;
}

export default function Runs() {
  const [runs, setRuns] = useState<RunSummary[] | null>(null);

  useEffect(() => {
    api<RunSummary[]>("/api/v1/runs").then(setRuns).catch(() => setRuns([]));
  }, []);

  if (runs === null) {
    return (
      <div className="flex items-center justify-center py-24 text-sm text-slate-500">
        <Spinner /> <span className="ml-2">Loading…</span>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-xl font-semibold text-slate-100">Runs</h1>
      <p className="mt-0.5 text-sm text-slate-500">Every agent execution, with cost and status.</p>

      <div className="mt-6">
        {runs.length === 0 ? (
          <Empty title="No runs yet" body="Run an agent to produce your first execution trace." />
        ) : (
          <div className="overflow-hidden rounded-xl border border-base-700">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-base-700 bg-base-900 text-left text-xs text-slate-500">
                  <th className="px-4 py-2.5 font-medium">Run</th>
                  <th className="px-4 py-2.5 font-medium">Agent</th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                  <th className="px-4 py-2.5 font-medium">Latency</th>
                  <th className="px-4 py-2.5 font-medium">Cost</th>
                  <th className="px-4 py-2.5 font-medium">Tokens</th>
                  <th className="px-4 py-2.5 font-medium">Created</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((r) => (
                  <tr key={r.id} className="border-b border-base-800 last:border-0 hover:bg-base-900/40">
                    <td className="px-4 py-2.5">
                      <Link href={`/runs/${r.id}`} className="mono text-xs text-accent hover:underline">
                        {r.id.slice(0, 18)}…
                      </Link>
                    </td>
                    <td className="px-4 py-2.5 text-slate-200">{r.agentName}</td>
                    <td className="px-4 py-2.5"><Badge status={r.status} /></td>
                    <td className="px-4 py-2.5 text-slate-400">{fmtMs(r.durationMs)}</td>
                    <td className="px-4 py-2.5 text-slate-400">{fmtUsd(r.estimatedCostUsd)}</td>
                    <td className="px-4 py-2.5 text-slate-400">{r.tokenUsage.toLocaleString()}</td>
                    <td className="px-4 py-2.5 text-xs text-slate-500">{timeAgo(r.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
