"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Badge, Card, Spinner } from "@/components/ui";

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
  const [tools, setTools] = useState<Tool[] | null>(null);

  useEffect(() => {
    api<Tool[]>("/api/v1/tools").then(setTools).catch(() => setTools([]));
  }, []);

  if (tools === null) {
    return (
      <div className="flex items-center justify-center py-24 text-sm text-slate-500">
        <Spinner /> <span className="ml-2">Loading…</span>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-xl font-semibold text-slate-100">Tools</h1>
      <p className="mt-0.5 text-sm text-slate-500">
        Capabilities agents can invoke — each with a risk classification and retry policy.
      </p>

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
    </div>
  );
}
