"use client";

import { fmtDateTime } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { Empty, ErrorBanner, Spinner } from "@/components/ui";

interface Audit {
  id: string;
  actor: string | null;
  resource: string;
  action: string;
  result: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export default function Audit() {
  const { data: events, error, loading, reload } = useApi<Audit[]>("/api/v1/audit");

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-sm text-slate-500">
        <Spinner /> <span className="ml-2">Loading…</span>
      </div>
    );
  }

  const resultColor: Record<string, string> = {
    allow: "text-slate-400",
    success: "text-emerald-400",
    deny: "text-red-400",
    failure: "text-red-400",
    approval: "text-amber-400",
  };

  return (
    <div>
      <h1 className="text-xl font-semibold text-slate-100">Audit logs</h1>
      <p className="mt-0.5 text-sm text-slate-500">
        Append-only record of every authorization and approval decision.
      </p>

      {error && <ErrorBanner message={error} onRetry={reload} />}

      <div className="mt-6">
        {(events ?? []).length === 0 ? (
          <Empty
            title={error ? "Audit log unavailable" : "No audit events"}
            body={
              error
                ? "The API request failed — see the error above."
                : "Authorization decisions will appear here."
            }
          />
        ) : (
          <div className="overflow-hidden rounded-xl border border-base-700">
            <table className="w-full text-sm">
              <tbody>
                {(events ?? []).map((e) => (
                  <tr key={e.id} className="border-b border-base-800 last:border-0">
                    <td className="px-4 py-2 text-xs text-slate-500">{fmtDateTime(e.createdAt)}</td>
                    <td className="px-4 py-2 text-slate-300">{e.resource}</td>
                    <td className="mono px-4 py-2 text-slate-300">{e.action}</td>
                    <td className={`px-4 py-2 ${resultColor[e.result] ?? "text-slate-400"}`}>{e.result}</td>
                    <td className="mono px-4 py-2 text-xs text-slate-600">
                      {JSON.stringify(e.metadata).slice(0, 80)}
                    </td>
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
