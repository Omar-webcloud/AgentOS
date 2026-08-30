"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, fmtUsd, fmtMs, timeAgo } from "@/lib/api";
import { Badge, Card, Stat, Spinner } from "@/components/ui";

interface Metrics {
  runsToday: number;
  successRate: number;
  failed: number;
  running: number;
  waiting: number;
  pendingApprovals: number;
  cost: number;
  tokens: number;
  avgLatency: number;
  agents: number;
  tools: number;
}

interface RunSummary {
  id: string;
  agentName: string;
  status: string;
  estimatedCostUsd: number;
  durationMs: number | null;
  createdAt: string;
}

export default function Dashboard() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [runs, setRuns] = useState<RunSummary[]>([]);
  const [agents, setAgents] = useState<any[]>([]);

  useEffect(() => {
    api<Metrics>("/api/v1/metrics").then(setMetrics).catch(() => {});
    api<RunSummary[]>("/api/v1/runs").then((r) => setRuns(r.slice(0, 8))).catch(() => {});
    api<any[]>("/api/v1/agents").then(setAgents).catch(() => {});
  }, []);

  if (!metrics) {
    return (
      <div className="flex items-center justify-center py-24 text-sm text-slate-500">
        <Spinner /> <span className="ml-2">Loading dashboard…</span>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-100">Dashboard</h1>
          <p className="mt-0.5 text-sm text-slate-500">What happened, what it cost, what needs attention.</p>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Runs today" value={metrics.runsToday} />
        <Stat label="Success rate" value={`${metrics.successRate.toFixed(1)}%`} />
        <Stat label="Avg latency" value={fmtMs(metrics.avgLatency)} />
        <Stat label="AI cost" value={fmtUsd(metrics.cost)} sub={`${metrics.tokens.toLocaleString()} tokens`} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* needs attention */}
        <Card title="Needs attention" className="lg:col-span-1">
          {metrics.failed === 0 && metrics.pendingApprovals === 0 && metrics.running === 0 ? (
            <p className="text-sm text-slate-500">All clear — nothing needs your attention.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {metrics.running > 0 && (
                <li className="flex items-center gap-2 text-blue-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-400" /> {metrics.running} runs in progress
                </li>
              )}
              {metrics.pendingApprovals > 0 && (
                <li>
                  <Link href="/approvals" className="flex items-center gap-2 text-amber-300 hover:underline">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-400" /> {metrics.pendingApprovals} approvals waiting
                  </Link>
                </li>
              )}
              {metrics.failed > 0 && (
                <li>
                  <Link href="/runs" className="flex items-center gap-2 text-red-300 hover:underline">
                    <span className="h-1.5 w-1.5 rounded-full bg-red-400" /> {metrics.failed} failed runs
                  </Link>
                </li>
              )}
            </ul>
          )}
        </Card>

        {/* recent runs */}
        <Card title="Recent runs" className="lg:col-span-2">
          {runs.length === 0 ? (
            <p className="text-sm text-slate-500">No runs yet — trigger an agent to see it here.</p>
          ) : (
            <table className="w-full text-sm">
              <tbody>
                {runs.map((r) => (
                  <tr key={r.id} className="border-b border-base-800 last:border-0">
                    <td className="py-2">
                      <Link href={`/runs/${r.id}`} className="mono text-xs text-accent hover:underline">
                        {r.id.slice(0, 18)}
                      </Link>
                    </td>
                    <td className="py-2 text-slate-300">{r.agentName}</td>
                    <td className="py-2"><Badge status={r.status} /></td>
                    <td className="py-2 text-right text-xs text-slate-500">{fmtUsd(r.estimatedCostUsd)}</td>
                    <td className="py-2 text-right text-xs text-slate-500">{timeAgo(r.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>

      {/* agents */}
      <div className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-medium text-slate-300">Agents</h2>
          <Link href="/agents" className="text-xs text-accent hover:underline">View all →</Link>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {agents.map((a) => (
            <Link key={a.id} href={`/agents/${a.id}`} className="rounded-xl border border-base-700 bg-base-900/70 p-4 transition-colors hover:border-accent/50">
              <div className="flex items-center justify-between">
                <span className="font-medium text-slate-100">{a.name}</span>
                <Badge status={a.status} />
              </div>
              <p className="mt-1 line-clamp-2 text-xs text-slate-500">{a.description || "No description"}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
