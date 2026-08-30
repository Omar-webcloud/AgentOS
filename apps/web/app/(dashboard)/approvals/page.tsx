"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, fmtDateTime } from "@/lib/api";
import { Badge, Empty, Spinner } from "@/components/ui";

interface Approval {
  id: string;
  action: string;
  riskLevel: string;
  payload: Record<string, unknown>;
  status: string;
  agentName: string;
  runId: string;
  expiresAt: string | null;
  createdAt: string;
}

export default function Approvals() {
  const [approvals, setApprovals] = useState<Approval[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  function load() {
    api<Approval[]>("/api/v1/approvals").then(setApprovals).catch(() => setApprovals([]));
  }

  useEffect(load, []);

  async function decide(id: string, decision: "approve" | "reject") {
    setBusy(id);
    try {
      await api(`/api/v1/approvals/${id}/${decision}`, { method: "POST", body: JSON.stringify({}) });
      load();
    } catch {
      /* ignore */
    } finally {
      setBusy(null);
    }
  }

  if (approvals === null) {
    return (
      <div className="flex items-center justify-center py-24 text-sm text-slate-500">
        <Spinner /> <span className="ml-2">Loading…</span>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-xl font-semibold text-slate-100">Approvals</h1>
      <p className="mt-0.5 text-sm text-slate-500">Human-in-the-loop decisions for high-risk actions.</p>

      <div className="mt-6 space-y-3">
        {approvals.length === 0 ? (
          <Empty title="No approvals" body="When an agent attempts a high-risk action, it appears here for review." />
        ) : (
          approvals.map((a) => (
            <div key={a.id} className="rounded-xl border border-base-700 bg-base-900/70 p-4">
              <div className="flex flex-wrap items-center gap-3">
                <Badge status={a.riskLevel} />
                <span className="mono text-sm font-medium text-slate-100">{a.action}</span>
                <Badge status={a.status} />
                <span className="ml-auto text-xs text-slate-500">{fmtDateTime(a.createdAt)}</span>
              </div>

              <div className="mt-3 rounded-lg bg-base-950 p-3">
                <div className="mb-1 text-xs text-slate-500">Payload</div>
                <pre className="mono text-xs text-slate-300">{JSON.stringify(a.payload, null, 2)}</pre>
              </div>

              <div className="mt-3 flex items-center gap-3 text-xs">
                <span className="text-slate-500">Agent: <span className="text-slate-300">{a.agentName}</span></span>
                <Link href={`/runs/${a.runId}`} className="mono text-accent hover:underline">
                  {a.runId.slice(0, 18)}…
                </Link>

                {a.status === "PENDING" && (
                  <div className="ml-auto flex gap-2">
                    <button
                      onClick={() => decide(a.id, "reject")}
                      disabled={busy === a.id}
                      className="rounded-lg border border-base-600 px-3 py-1.5 font-medium text-slate-300 hover:bg-base-800 disabled:opacity-60"
                    >
                      Reject
                    </button>
                    <button
                      onClick={() => decide(a.id, "approve")}
                      disabled={busy === a.id}
                      className="rounded-lg bg-emerald-600 px-3 py-1.5 font-medium text-white hover:bg-emerald-500 disabled:opacity-60"
                    >
                      {busy === a.id ? "…" : "Approve"}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
