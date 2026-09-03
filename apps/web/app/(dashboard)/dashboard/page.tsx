"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { api, timeAgo } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { Badge, ErrorBanner, Spinner } from "@/components/ui";
import { BRAINS, brainMeta, type BrainId } from "@/lib/brains";
import { BrainMark } from "@/components/mark";

interface OutlineAgent {
  id: string;
  name: string;
  description: string;
  status: string;
  steps: { n: number; title: string; tool: string; detail: string; risk: string }[];
  lastRun: { id: string; status: string; createdAt: string; brain: string | null } | null;
  pendingApprovals: { id: string; action: string; riskLevel: string; payload: Record<string, unknown> }[];
}

interface Provider {
  provider: BrainId;
  status: string;
  googleEmail: string;
}

export default function Outline() {
  const { data: agents, error, loading, reload } = useApi<OutlineAgent[]>("/api/v1/outline");
  const { data: providers } = useApi<Provider[]>("/api/v1/providers");
  const connected = useMemo(
    () => new Set((providers ?? []).filter((p) => p.status === "connected").map((p) => p.provider)),
    [providers],
  );
  const [brain, setBrain] = useState<BrainId>("chatgpt");
  const [busy, setBusy] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const effectiveBrain: BrainId =
    connected.has(brain) ? brain : (BRAINS.find((b) => connected.has(b.id))?.id ?? brain);

  async function trigger(agent: OutlineAgent) {
    if (!connected.has(effectiveBrain)) {
      setErr("Connect ChatGPT, Gemini, or Grok with Google first — open Brains.");
      return;
    }
    setBusy(agent.id);
    setErr(null);
    setFlash(null);
    try {
      const run = await api<{ id: string; status: string }>(`/api/v1/agents/${agent.id}/runs`, {
        method: "POST",
        body: JSON.stringify({
          brain: effectiveBrain,
          triggerType: "manual",
          input: defaultInput(agent),
        }),
      });
      setFlash(`${agent.name} triggered · ${run.status.replace(/_/g, " ").toLowerCase()}`);
      reload();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Trigger failed");
    } finally {
      setBusy(null);
    }
  }

  async function resolve(id: string, decision: "approve" | "reject") {
    setBusy(id);
    setErr(null);
    try {
      await api(`/api/v1/approvals/${id}/${decision}`, { method: "POST", body: JSON.stringify({}) });
      reload();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not resolve");
    } finally {
      setBusy(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-sm text-slate-500">
        <Spinner /> <span className="ml-2">Loading outline…</span>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.25em] text-copper">Workspace</p>
          <h1 className="font-serif text-4xl text-paper">Outline</h1>
          <p className="mt-1 text-sm text-slate-500">Pick a brain. Trigger the agent. That is the whole product.</p>
        </div>
        <BrainSwitcher value={effectiveBrain} connected={connected} onChange={setBrain} />
      </div>

      {connected.size === 0 && (
        <div className="mt-6 rounded-2xl border border-copper/30 bg-copper/10 px-4 py-3 text-sm text-paper">
          No brain connected yet.{" "}
          <Link href="/brains" className="underline decoration-copper/50 underline-offset-2">
            Connect ChatGPT, Gemini, or Grok with Google
          </Link>
          .
        </div>
      )}

      {(error || err) && <ErrorBanner message={error ?? err ?? ""} onRetry={error ? reload : undefined} />}
      {flash && (
        <div className="mt-5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
          {flash}
        </div>
      )}

      <div className="mt-8 overflow-hidden rounded-[28px] border border-[#d7c9ae]/25 bg-[#1a1612]">
        <div className="border-b border-[#d7c9ae]/15 bg-paper px-8 py-5 text-ink">
          <div className="font-serif text-2xl">I. Agents you trigger</div>
          <div className="mt-1 text-sm text-[#5c5348]">
            {connected.size > 0
              ? `Running through ${brainMeta(effectiveBrain)?.name ?? effectiveBrain}`
              : "Connect a brain to fire any line"}
          </div>
        </div>

        {(agents ?? []).length === 0 ? (
          <div className="px-8 py-16 text-center text-sm text-slate-500">
            No agents in this outline yet.
            <button
              onClick={() =>
                api("/api/v1/organization/seed", { method: "POST", body: JSON.stringify({}) }).then(() => reload())
              }
              className="mt-3 block w-full text-copper hover:underline"
            >
              Load starter agents
            </button>
          </div>
        ) : (
          <ol className="divide-y divide-base-800">
            {(agents ?? []).map((agent, idx) => (
              <li key={agent.id} className="px-8 py-7">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-baseline gap-3">
                      <span className="font-serif text-lg text-copper">{roman(idx + 1)}.</span>
                      <Link href={`/agents/${agent.id}`} className="font-serif text-2xl text-paper hover:underline">
                        {agent.name}
                      </Link>
                    </div>
                    <p className="mt-1 max-w-lg text-sm text-slate-500">{agent.description}</p>
                  </div>
                  <button
                    onClick={() => void trigger(agent)}
                    disabled={busy === agent.id}
                    className="shrink-0 rounded-full bg-copper px-4 py-2 text-sm font-semibold text-ink hover:bg-copper-dim disabled:opacity-60"
                  >
                    {busy === agent.id ? "Triggering…" : "Trigger"}
                  </button>
                </div>

                <ol className="mt-4 space-y-1.5 pl-9">
                  {agent.steps.map((step, i) => (
                    <li key={step.tool} className="flex items-baseline gap-3 text-sm">
                      <span className="w-5 font-serif text-slate-600">{letter(i)}.</span>
                      <span className="text-slate-200">{step.title}</span>
                      {step.risk !== "READ" && (
                        <span className="text-[10px] uppercase tracking-wider text-amber-400/80">{step.risk.replace(/_/g, " ")}</span>
                      )}
                    </li>
                  ))}
                </ol>

                {agent.pendingApprovals.length > 0 && (
                  <div className="mt-4 ml-9 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3">
                    {agent.pendingApprovals.map((a) => (
                      <div key={a.id} className="flex flex-wrap items-center gap-2 text-sm">
                        <span className="text-amber-200">Needs you · {a.action}</span>
                        <button
                          onClick={() => void resolve(a.id, "approve")}
                          className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs text-emerald-200"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => void resolve(a.id, "reject")}
                          className="rounded-full bg-red-500/20 px-3 py-1 text-xs text-red-200"
                        >
                          Reject
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {agent.lastRun && (
                  <div className="mt-3 ml-9 text-xs text-slate-500">
                    Last trigger{" "}
                    <Link href={`/runs/${agent.lastRun.id}`} className="text-copper hover:underline">
                      {timeAgo(agent.lastRun.createdAt)}
                    </Link>
                    <span className="mx-2">·</span>
                    <Badge status={agent.lastRun.status} />
                    {agent.lastRun.brain && (
                      <span className="ml-2 text-slate-600">{brainMeta(agent.lastRun.brain)?.name}</span>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}

function BrainSwitcher({
  value,
  connected,
  onChange,
}: {
  value: BrainId;
  connected: Set<BrainId>;
  onChange: (id: BrainId) => void;
}) {
  return (
    <div className="flex rounded-full border border-base-700 bg-base-900 p-1">
      {BRAINS.map((b) => {
        const on = connected.has(b.id);
        const active = value === b.id;
        return (
          <button
            key={b.id}
            onClick={() => (on ? onChange(b.id) : (window.location.href = "/brains"))}
            title={on ? `Trigger with ${b.name}` : `Connect ${b.name}`}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs transition ${
              active && on ? "bg-base-700 text-paper" : on ? "text-slate-400 hover:text-paper" : "text-slate-600"
            }`}
          >
            <BrainMark id={b.id} className="h-4 w-4" />
            {b.name}
          </button>
        );
      })}
    </div>
  );
}

function defaultInput(agent: OutlineAgent): Record<string, unknown> {
  if (/support/i.test(agent.name)) return { customer: "cus_123", amount: 830 };
  if (/review/i.test(agent.name)) return { repository: "acme/api", pull_request: 182 };
  return { task: agent.name };
}

function roman(n: number): string {
  const map: [number, string][] = [
    [10, "X"],
    [9, "IX"],
    [5, "V"],
    [4, "IV"],
    [1, "I"],
  ];
  let rest = n;
  let out = "";
  for (const [v, s] of map) {
    while (rest >= v) {
      out += s;
      rest -= v;
    }
  }
  return out;
}

function letter(i: number): string {
  return String.fromCharCode(65 + i);
}
