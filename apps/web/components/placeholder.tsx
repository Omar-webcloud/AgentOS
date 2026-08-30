"use client";

export function Placeholder({ title, desc }: { title: string; desc: string }) {
  return (
    <div>
      <h1 className="text-xl font-semibold text-slate-100">{title}</h1>
      <p className="mt-0.5 text-sm text-slate-500">{desc}</p>
      <div className="mt-6 flex flex-col items-center justify-center rounded-xl border border-dashed border-base-600 py-20 text-center">
        <div className="text-base font-medium text-slate-300">Planned subsystem</div>
        <p className="mt-1 max-w-md text-sm text-slate-500">
          This area is part of the AgentOS roadmap. The vertical slice (auth → agent → LLM →
          run → trace → tool → approval) is fully implemented end-to-end.
        </p>
      </div>
    </div>
  );
}
