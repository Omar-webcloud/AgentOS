"use client";

import type { ReactNode } from "react";

export function Card({
  title,
  children,
  className = "",
  action,
}: {
  title?: string;
  children: ReactNode;
  className?: string;
  action?: ReactNode;
}) {
  return (
    <div className={`rounded-xl border border-base-700 bg-base-900/70 ${className}`}>
      {(title || action) && (
        <div className="flex items-center justify-between border-b border-base-700 px-4 py-3">
          <h3 className="text-sm font-medium text-slate-300">{title}</h3>
          {action}
        </div>
      )}
      <div className="p-4">{children}</div>
    </div>
  );
}

const STATUS_STYLES: Record<string, string> = {
  QUEUED: "bg-slate-500/15 text-slate-300 border-slate-500/30",
  RUNNING: "bg-blue-500/15 text-blue-300 border-blue-500/30",
  WAITING_APPROVAL: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  COMPLETED: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  FAILED: "bg-red-500/15 text-red-300 border-red-500/30",
  CANCELLED: "bg-slate-500/15 text-slate-400 border-slate-500/30",
  TIMED_OUT: "bg-orange-500/15 text-orange-300 border-orange-500/30",
  PENDING: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  APPROVED: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  REJECTED: "bg-red-500/15 text-red-300 border-red-500/30",
  EXPIRED: "bg-slate-500/15 text-slate-400 border-slate-500/30",
  SUCCEEDED: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  active: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  draft: "bg-slate-500/15 text-slate-300 border-slate-500/30",
  testing: "bg-blue-500/15 text-blue-300 border-blue-500/30",
  paused: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  deprecated: "bg-orange-500/15 text-orange-300 border-orange-500/30",
  archived: "bg-slate-500/15 text-slate-400 border-slate-500/30",
  READ: "bg-slate-500/15 text-slate-300 border-slate-500/30",
  LOW_RISK_WRITE: "bg-blue-500/15 text-blue-300 border-blue-500/30",
  HIGH_RISK_WRITE: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  DESTRUCTIVE: "bg-red-500/15 text-red-300 border-red-500/30",
};

export function Badge({ status, label }: { status: string; label?: string }) {
  const style = STATUS_STYLES[status] ?? "bg-slate-500/15 text-slate-300 border-slate-500/30";
  return (
    <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium ${style}`}>
      {(label ?? status).replace(/_/g, " ")}
    </span>
  );
}

export function Stat({ label, value, sub }: { label: string; value: ReactNode; sub?: string }) {
  return (
    <div className="rounded-xl border border-base-700 bg-base-900/70 p-4">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold tracking-tight text-slate-100">{value}</div>
      {sub && <div className="mt-0.5 text-xs text-slate-500">{sub}</div>}
    </div>
  );
}

export function Empty({ title, body, cta }: { title: string; body: string; cta?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-base-600 py-16 text-center">
      <div className="text-base font-medium text-slate-300">{title}</div>
      <p className="mt-1 max-w-sm text-sm text-slate-500">{body}</p>
      {cta && <div className="mt-4">{cta}</div>}
    </div>
  );
}

export function CodeBlock({ children }: { children: ReactNode }) {
  return (
    <pre className="mono overflow-x-auto rounded-lg bg-base-950 p-3 text-xs leading-relaxed text-slate-300">
      {children}
    </pre>
  );
}

export function Spinner() {
  return (
    <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-600 border-t-accent" />
  );
}
