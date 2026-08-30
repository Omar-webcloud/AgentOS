"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getToken } from "@/lib/auth";

const FEATURES = [
  { title: "Agent Runtime", desc: "Durable, checkpointed execution with retries and budgets." },
  { title: "Tool & MCP Platform", desc: "Risk-classified tools behind a deterministic policy engine." },
  { title: "Human-in-the-loop", desc: "High-risk actions pause for explicit approval." },
  { title: "Observability", desc: "Per-run traces, costs, and token usage — always on." },
  { title: "Evaluation", desc: "Regression suites and gates for every agent version." },
  { title: "Governance", desc: "RBAC, audit logs, and secrets management by default." },
];

export default function Landing() {
  const [authed, setAuthed] = useState(false);
  useEffect(() => setAuthed(Boolean(getToken())), []);

  return (
    <main className="min-h-screen bg-base-950 text-slate-200">
      {/* nav */}
      <header className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-accent text-sm font-bold text-white">
            A
          </div>
          <span className="text-sm font-semibold text-slate-100">AgentOS</span>
        </div>
        <nav className="flex items-center gap-4 text-sm text-slate-400">
          <a href="#features" className="hover:text-slate-200">Features</a>
          <a href="#how" className="hover:text-slate-200">How it works</a>
          <Link href={authed ? "/dashboard" : "/login"} className="rounded-lg bg-accent px-3.5 py-1.5 font-medium text-white hover:bg-accent-dim">
            {authed ? "Open console" : "Sign in"}
          </Link>
        </nav>
      </header>

      {/* hero */}
      <section className="relative overflow-hidden">
        <div className="grid-bg absolute inset-0" />
        <div className="relative mx-auto max-w-5xl px-6 pb-24 pt-20 text-center">
          <div className="mx-auto mb-5 inline-flex items-center gap-2 rounded-full border border-base-700 bg-base-900 px-3 py-1 text-xs text-slate-400">
            <span className="h-1.5 w-1.5 animate-pulseDot rounded-full bg-emerald-400" />
            Production AI agent &amp; workflow platform
          </div>
          <h1 className="text-5xl font-bold leading-tight tracking-tight text-white md:text-6xl">
            Build AI agents that
            <br />
            <span className="text-accent">actually do the work.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-400">
            Design, deploy, observe, evaluate, and govern autonomous workflows from one
            platform. Tools, policies, approvals, traces — not just a chatbot.
          </p>
          <div className="mt-8 flex items-center justify-center gap-3">
            <Link href={authed ? "/dashboard" : "/login"} className="rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-white hover:bg-accent-dim">
              Build an agent
            </Link>
            <a href="#features" className="rounded-lg border border-base-600 px-5 py-2.5 text-sm font-semibold text-slate-300 hover:bg-base-850">
              View the platform
            </a>
          </div>
          <div className="mono mx-auto mt-10 max-w-md rounded-lg border border-base-700 bg-base-900/80 p-4 text-left text-xs leading-relaxed text-slate-400">
            <div className="text-slate-500"># run_8472 · Code Reviewer</div>
            <div className="mt-1"><span className="text-emerald-400">✓</span> github.get_pull_request <span className="text-slate-600">238ms</span></div>
            <div><span className="text-emerald-400">✓</span> github.get_diff <span className="text-slate-600">412ms</span></div>
            <div><span className="text-emerald-400">✓</span> github.create_comment <span className="text-slate-600">196ms</span></div>
            <div className="mt-1 text-slate-500">cost $0.012 · 4.2s · policy: allowed</div>
          </div>
        </div>
      </section>

      {/* features */}
      <section id="features" className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="text-center text-3xl font-bold text-white">The full execution stack</h2>
        <p className="mx-auto mt-3 max-w-xl text-center text-slate-400">
          Every subsystem a production agent needs — in one place, wired together.
        </p>
        <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-xl border border-base-700 bg-base-900/60 p-5">
              <h3 className="font-semibold text-slate-100">{f.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-400">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* how it works */}
      <section id="how" className="mx-auto max-w-4xl px-6 pb-24">
        <h2 className="text-center text-3xl font-bold text-white">How it works</h2>
        <div className="mono mt-10 space-y-3 rounded-xl border border-base-700 bg-base-900/60 p-6 text-sm text-slate-300">
          <div className="flex gap-3"><span className="text-accent">1</span> Trigger — a webhook, schedule, or API call starts a run</div>
          <div className="flex gap-3"><span className="text-accent">2</span> Plan — the agent decides the next tool call</div>
          <div className="flex gap-3"><span className="text-accent">3</span> Authorize — the policy engine approves, denies, or escalates</div>
          <div className="flex gap-3"><span className="text-accent">4</span> Execute — the tool runs with retries, timeouts, and idempotency</div>
          <div className="flex gap-3"><span className="text-accent">5</span> Observe — every step lands in a durable trace with cost</div>
        </div>
      </section>

      <footer className="border-t border-base-800 py-8 text-center text-xs text-slate-600">
        AgentOS — a production-grade multi-tenant AI agent platform.
      </footer>
    </main>
  );
}
