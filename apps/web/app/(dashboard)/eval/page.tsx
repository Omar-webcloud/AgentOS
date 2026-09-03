"use client";

import { useApi } from "@/lib/use-api";
import { Badge, Card, Empty, ErrorBanner, Spinner } from "@/components/ui";

interface Dataset {
  id: string;
  name: string;
  createdAt: string;
}

interface EvalCase {
  id: string;
  datasetId: string;
  name: string;
  input: Record<string, unknown>;
  expectedTools: string[];
  expectedOutputContains: string[];
  constraints: string[];
}

export default function Evaluation() {
  const { data: datasets, error: datasetsError, loading, reload } = useApi<Dataset[]>("/api/v1/eval/datasets");
  const { data: cases, error: casesError } = useApi<EvalCase[]>("/api/v1/eval/cases");
  const error = datasetsError ?? casesError;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-sm text-slate-500">
        <Spinner /> <span className="ml-2">Loading…</span>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-xl font-semibold text-slate-100">Evaluation</h1>
      <p className="mt-0.5 text-sm text-slate-500">
        Datasets and test cases for measuring agent quality and regression.
      </p>

      {error && <ErrorBanner message={error} onRetry={reload} />}

      <div className="mt-6 space-y-6">
        {(datasets ?? []).length === 0 ? (
          <Empty
            title={error ? "Evaluation unavailable" : "No datasets"}
            body={
              error
                ? "The API request failed — see the error above."
                : "Create a dataset to start evaluating your agents."
            }
          />
        ) : (
          (datasets ?? []).map((d) => (
            <Card key={d.id} title={d.name}>
              {(cases ?? []).filter((c) => c.datasetId === d.id).length === 0 ? (
                <p className="text-sm text-slate-500">No test cases in this dataset.</p>
              ) : (
                <div className="space-y-3">
                  {(cases ?? [])
                    .filter((c) => c.datasetId === d.id)
                    .map((c) => (
                      <div key={c.id} className="rounded-lg border border-base-700 bg-base-850 p-4">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-slate-200">{c.name}</span>
                          <span className="text-xs text-slate-500">case</span>
                        </div>
                        <div className="mt-2 text-xs text-slate-500">Input</div>
                        <pre className="mono mt-1 text-xs text-slate-300">{JSON.stringify(c.input, null, 2)}</pre>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {c.expectedTools.map((t) => (
                            <span key={t} className="mono rounded bg-base-700 px-1.5 py-0.5 text-[11px] text-slate-300">{t}</span>
                          ))}
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {c.constraints.map((con) => (
                            <Badge key={con} status="DESTRUCTIVE" label={con} />
                          ))}
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
