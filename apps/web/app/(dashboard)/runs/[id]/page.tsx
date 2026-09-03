"use client";

import { use } from "react";
import Link from "next/link";
import { fmtUsd, fmtMs, fmtDateTime } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { Badge, Card, CodeBlock, ErrorBanner, Spinner } from "@/components/ui";

interface Step {
  id: string;
  sequence: number;
  type: string;
  status: string;
  toolId: string | null;
  input: unknown;
  output: unknown;
  error: string | null;
  durationMs: number | null;
  costUsd: number;
}

interface Trace {
  id: string;
  name: string;
  kind: string;
  parentId: string | null;
  durationMs: number;
  attributes: Record<string, unknown>;
}

interface Approval {
  id: string;
  action: string;
  riskLevel: string;
  payload: Record<string, unknown>;
  status: string;
}

interface RunDetail {
  id: string;
  agentName: string;
  status: string;
  triggerType: string;
  input: Record<string, unknown>;
  output: unknown;
  error: string | null;
  estimatedCostUsd: number;
  tokenUsage: number;
  durationMs: number | null;
  createdAt: string;
  completedAt: string | null;
  steps: Step[];
  traces: Trace[];
  approvals: Approval[];
}

const STEP_ICON: Record<string, string> = {
  plan: "◌",
  llm: "✦",
  tool: "⚙",
  retrieval: "▤",
  approval: "✓",
  final: "◆",
  error: "✕",
};

export default function RunDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: run, error: loadError, loading, reload } = useApi<RunDetail>(`/api/v1/runs/${id}`);
  const { data: tools } = useApi<{ id: string; name: string }[]>("/api/v1/tools");
  const toolMap: Record<string, string> = Object.fromEntries((tools ?? []).map((t) => [t.id, t.name]));

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-sm text-slate-500">
        <Spinner /> <span className="ml-2">Loading run…</span>
      </div>
    );
  }

  if (!run) {
    return (
      <div>
        <h1 className="text-xl font-semibold text-slate-100">Run</h1>
        <ErrorBanner message={loadError ?? "Run not found"} onRetry={reload} />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Link href="/runs" className="text-sm text-slate-500 hover:text-slate-300">← Runs</Link>
            <span className="text-slate-600">/</span>
            <h1 className="mono text-lg font-medium text-slate-100">{run.id}</h1>
            <Badge status={run.status} />
          </div>
          <p className="mt-1 text-sm text-slate-500">
            {run.agentName} · {run.triggerType} · {fmtDateTime(run.createdAt)}
          </p>
        </div>
      </div>

      {run.error && (
        <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {run.error}
        </div>
      )}

      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatMini label="Duration" value={fmtMs(run.durationMs)} />
        <StatMini label="Cost" value={fmtUsd(run.estimatedCostUsd)} />
        <StatMini label="Tokens" value={run.tokenUsage.toLocaleString()} />
        <StatMini label="Steps" value={String(run.steps.length)} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* timeline */}
        <Card title="Execution timeline">
          <ol className="relative space-y-1 border-l border-base-700 pl-4">
            {run.steps.map((s) => (
              <li key={s.id} className="relative py-1.5">
                <span className="absolute -left-[21px] top-2.5 flex h-2.5 w-2.5 items-center justify-center">
                  <span className={`h-2 w-2 rounded-full ${dotColor(s.status)}`} />
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-xs opacity-60">{STEP_ICON[s.type] ?? "•"}</span>
                  <span className="mono text-xs text-slate-300">
                    {s.type}
                    {s.toolId && <span className="text-slate-600"> · {toolMap[s.toolId] ?? s.toolId.slice(0, 8)}</span>}
                  </span>
                  <Badge status={s.status} />
                  <span className="ml-auto text-[11px] text-slate-600">{fmtMs(s.durationMs)}</span>
                </div>
                {s.error && <div className="mt-1 text-xs text-red-300">{s.error}</div>}
              </li>
            ))}
          </ol>
        </Card>

        {/* trace spans */}
        <Card title="Trace spans">
          {run.traces.length === 0 ? (
            <p className="text-sm text-slate-500">No spans recorded.</p>
          ) : (
            <ul className="space-y-1.5">
              {run.traces.map((t) => (
                <li key={t.id} className="flex items-center gap-2 text-xs">
                  <span className="mono text-slate-400">{t.kind}</span>
                  <span className="mono flex-1 truncate text-slate-300">{t.name}</span>
                  <span className="text-slate-600">{fmtMs(t.durationMs)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card title="Input">
          <CodeBlock>{JSON.stringify(run.input, null, 2)}</CodeBlock>
        </Card>
        <Card title="Output">
          <CodeBlock>
            {typeof run.output === "string" ? run.output : JSON.stringify(run.output, null, 2)}
          </CodeBlock>
        </Card>
      </div>

      {run.approvals.length > 0 && (
        <div className="mt-6">
          <Card title="Approvals">
            <ul className="space-y-2">
              {run.approvals.map((a) => (
                <li key={a.id} className="flex items-center gap-3 rounded-lg border border-base-700 bg-base-850 px-3 py-2 text-sm">
                  <Badge status={a.riskLevel} />
                  <span className="mono text-slate-200">{a.action}</span>
                  <span className="mono text-slate-500">{JSON.stringify(a.payload)}</span>
                  <span className="ml-auto"><Badge status={a.status} /></span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      )}
    </div>
  );
}

function StatMini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-base-700 bg-base-900/70 px-4 py-3">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="mono mt-0.5 text-lg text-slate-100">{value}</div>
    </div>
  );
}

function dotColor(status: string): string {
  switch (status) {
    case "SUCCEEDED":
    case "COMPLETED":
    case "APPROVED":
      return "bg-emerald-400";
    case "FAILED":
    case "REJECTED":
      return "bg-red-400";
    case "RUNNING":
      return "bg-blue-400 animate-pulseDot";
    case "PENDING":
      return "bg-amber-400 animate-pulseDot";
    default:
      return "bg-slate-500";
  }
}


