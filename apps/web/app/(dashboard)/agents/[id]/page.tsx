"use client";

import { use, useState } from "react";
import Link from "next/link";
import { api, fmtUsd, timeAgo } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { Badge, Card, CodeBlock, ErrorBanner, Spinner } from "@/components/ui";

interface Version {
  id: string;
  version: number;
  instructions: string;
  modelConfig: { model: string; provider: string; temperature: number };
  runtimeConfig: { maxIterations: number; maxCostUsd: number; maxExecutionTimeMs: number };
  toolIds: string[];
  policyConfig: { name: string; when: unknown; action: string }[];
  createdAt: string;
}

interface AgentDetail {
  id: string;
  name: string;
  description: string;
  status: string;
  slug: string;
  versions: Version[];
}

interface Tool {
  id: string;
  name: string;
  risk: string;
  description: string;
}

export default function AgentDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: agent, error: loadError, loading, reload } = useApi<AgentDetail>(`/api/v1/agents/${id}`);
  const { data: tools } = useApi<Tool[]>("/api/v1/tools");
  const [running, setRunning] = useState(false);
  const [runResult, setRunResult] = useState<{ id: string; status: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [brain, setBrain] = useState<"chatgpt" | "gemini" | "grok">("chatgpt");
  const { data: providers } = useApi<{ provider: string; status: string }[]>("/api/v1/providers");
  const connected = new Set((providers ?? []).filter((p) => p.status === "connected").map((p) => p.provider));

  async function runAgent() {
    setRunning(true);
    setError(null);
    setRunResult(null);
    try {
      const run = await api<{ id: string; status: string }>(`/api/v1/agents/${id}/runs`, {
        method: "POST",
        body: JSON.stringify({
          input: { repository: "acme/api", pull_request: 182 },
          triggerType: "manual",
          brain,
        }),
      });
      setRunResult(run);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setRunning(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-sm text-slate-500">
        <Spinner /> <span className="ml-2">Loading…</span>
      </div>
    );
  }

  // A failed request (or a 404) used to leave this page on the spinner forever.
  if (!agent) {
    return (
      <div>
        <h1 className="text-xl font-semibold text-slate-100">Agent</h1>
        <ErrorBanner message={loadError ?? "Agent not found"} onRetry={reload} />
      </div>
    );
  }

  const version = agent.versions[0];

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold text-slate-100">{agent.name}</h1>
            <Badge status={agent.status} />
          </div>
          <p className="mt-0.5 text-sm text-slate-500">{agent.description || "No description"}</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={brain}
            onChange={(e) => setBrain(e.target.value as typeof brain)}
            className="rounded-lg border border-base-600 bg-base-950 px-2 py-2 text-sm text-slate-200 outline-none"
          >
            {(["chatgpt", "gemini", "grok"] as const).map((b) => (
              <option key={b} value={b} disabled={!connected.has(b)}>
                {b === "chatgpt" ? "ChatGPT" : b === "gemini" ? "Gemini" : "Grok"}
                {!connected.has(b) ? " (connect)" : ""}
              </option>
            ))}
          </select>
          <button
            onClick={runAgent}
            disabled={running || !connected.has(brain)}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-ink hover:bg-accent-dim disabled:opacity-60"
          >
            {running ? "Triggering…" : "Trigger"}
          </button>
        </div>
      </div>

      {runResult && (
        <div className="mt-4 rounded-lg border border-base-700 bg-base-900 px-4 py-3 text-sm">
          <span className="text-slate-400">Started run </span>
          <Link href={`/runs/${runResult.id}`} className="mono text-accent hover:underline">
            {runResult.id}
          </Link>
          <span className="ml-2"><Badge status={runResult.status} /></span>
        </div>
      )}
      {error && (
        <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>
      )}

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* instructions */}
        <Card title="Instructions" className="lg:col-span-2">
          {version ? (
            <CodeBlock>{version.instructions}</CodeBlock>
          ) : (
            <p className="text-sm text-slate-500">No published version.</p>
          )}
        </Card>

        {/* config */}
        <div className="space-y-4">
          <Card title="Runtime">
            {version ? (
              <dl className="space-y-2 text-sm">
                <Row k="Model" v={version.modelConfig.model} />
                <Row k="Provider" v={version.modelConfig.provider} />
                <Row k="Max iterations" v={String(version.runtimeConfig.maxIterations)} />
                <Row k="Cost budget" v={fmtUsd(version.runtimeConfig.maxCostUsd)} />
              </dl>
            ) : (
              <p className="text-sm text-slate-500">—</p>
            )}
          </Card>

          <Card title="Policies">
            {version && version.policyConfig.length > 0 ? (
              <ul className="space-y-2 text-sm">
                {version.policyConfig.map((p) => (
                  <li key={p.name} className="rounded-lg bg-base-850 px-3 py-2">
                    <span className="font-medium text-slate-200">{p.name}</span>
                    <span className="ml-2"><Badge status={p.action === "deny" ? "REJECTED" : p.action === "require_approval" ? "PENDING" : "APPROVED"} label={p.action} /></span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-500">No explicit policies — defaults apply (fail closed).</p>
            )}
          </Card>
        </div>
      </div>

      {/* tools */}
      <div className="mt-6">
        <Card title="Attached tools">
          {version && version.toolIds.length > 0 ? (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {version.toolIds.map((tid) => {
                const tool = tools?.find((t) => t.id === tid);
                return (
                  <div key={tid} className="flex items-center justify-between rounded-lg border border-base-700 bg-base-850 px-3 py-2">
                    <div className="min-w-0">
                      <div className="mono truncate text-xs text-slate-200">{tool?.name ?? tid}</div>
                      <div className="truncate text-[11px] text-slate-500">{tool?.description}</div>
                    </div>
                    {tool && <Badge status={tool.risk} />}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-slate-500">No tools attached.</p>
          )}
        </Card>
      </div>

      {/* versions */}
      <div className="mt-6">
        <Card title="Versions">
          {agent.versions.length > 0 ? (
            <table className="w-full text-sm">
              <tbody>
                {agent.versions.map((v) => (
                  <tr key={v.id} className="border-b border-base-800 last:border-0">
                    <td className="py-2 font-medium text-slate-200">v{v.version}</td>
                    <td className="py-2 text-slate-400">{v.modelConfig.model}</td>
                    <td className="py-2 text-right text-xs text-slate-500">{timeAgo(v.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-sm text-slate-500">No versions yet.</p>
          )}
        </Card>
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-slate-500">{k}</dt>
      <dd className="mono text-slate-200">{v}</dd>
    </div>
  );
}
