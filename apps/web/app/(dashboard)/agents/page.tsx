"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { Badge, Card, Empty, Spinner } from "@/components/ui";

interface Agent {
  id: string;
  name: string;
  slug: string;
  description: string;
  status: string;
  currentVersionId: string | null;
}

export default function Agents() {
  const [agents, setAgents] = useState<Agent[] | null>(null);

  useEffect(() => {
    api<Agent[]>("/api/v1/agents").then(setAgents).catch(() => setAgents([]));
  }, []);

  if (agents === null) {
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
      </div>

      <div className="mt-6">
        {agents.length === 0 ? (
          <Empty
            title="No agents yet"
            body="Create your first autonomous worker."
          />
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {agents.map((a) => (
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
