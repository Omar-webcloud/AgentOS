# AgentOS

**Production AI Agent & Workflow Automation Platform**

Build, deploy, observe, evaluate, and govern autonomous AI agents that safely do
real work — through controlled access to tools, data, and external systems.

> **Build AI agents that can safely do real work—not just generate text.**

AgentOS is *not* a chatbot. It is an execution-and-control platform for
autonomous software agents: a deterministic runtime wraps a probabilistic LLM,
so every tool call is authorized, every step is checkpointed, and every run
produces a durable, costed trace.

---

## What's implemented

This repository contains a **working vertical slice** (the PRD's "Milestone 1–3"
build order) rather than a breadth-first stub. The following is fully functional,
end-to-end, against a real database:

```
Authentication  →  Agent  →  LLM  →  Run  →  Trace
                                        →  Tool  →  Authorization  →  Execution
                                                          →  Human approval  →  Action
```

Concretely:

- **Multi-tenant auth** — email/password registration & login with scrypt-hashed
  passwords and HMAC-signed sessions; org → project → environment hierarchy.
- **RBAC** — five roles (`owner`, `admin`, `developer`, `operator`, `viewer`)
  with granular permission strings (`agent:create`, `approval:approve`, …).
- **Agents & versions** — versioned instructions, model config, runtime budgets,
  attached tools, and declarative policies.
- **LLM gateway** — a deterministic `mock` provider (zero API keys, reproducible
  runs) plus an optional OpenAI provider with model fallback.
- **Agent runtime** — the reactive agent loop, structured tool calls, an execution
  state machine (`QUEUED → RUNNING → WAITING_APPROVAL → COMPLETED/FAILED/…`),
  durable execution via checkpoints, and budget enforcement (cost/token/iteration).
- **Tool runtime** — risk-classified tools (`READ`, `LOW_RISK_WRITE`,
  `HIGH_RISK_WRITE`, `DESTRUCTIVE`) with timeout, exponential-backoff retry, and
  idempotency keys.
- **Policy engine** — declarative rules with "most restrictive wins" precedence and
  a fail-closed default (unknown tool → DENY, destructive → approval).
- **Human-in-the-loop** — approval-required tool calls pause the run; a separate
  `resolveApproval` path resumes it after an approve/reject decision.
- **Observability** — per-step spans (LLM, TOOL, APPROVAL) with cost and token
  usage, plus an append-only audit log of every authorization decision.
- **Evaluation scaffolding** — datasets and test cases (regression harness).
- **Web console** — Next.js + Tailwind UI (dark, developer-focused): landing,
  login/register, dashboard, agents, runs (timeline + trace viewer), approvals,
  tools, audit log, evaluation.

## Live demo

The repository ships with a seeded demo. Log in with:

```
demo@agentos.dev / demo1234
```

Two agents are pre-built:

| Agent | Demonstrates |
| --- | --- |
| **Code Reviewer** | deterministic multi-step run: fetch PR → fetch diff → post review, with cost/trace |
| **Support Agent** | human-in-the-loop: a `$830` refund triggers a `require_approval` policy and pauses |

Run the Support Agent, watch it pause in `Approvals`, then approve or reject it
from the UI — the run resumes and completes (or fails closed on rejection).

---

## Quickstart

Requires **Node.js ≥ 22.5** (uses the built-in `node:sqlite`).

```bash
npm install

# terminal 1 — API (Fastify, port 4000)
npm run dev:api

# terminal 2 — web console (Next.js, port 3000)
npm run dev:web
```

Open http://localhost:3000. The Next.js dev server proxies `/api/*` to the API.

The database is SQLite (created at `apps/api/data/agentos.db`) and is seeded
automatically on first boot.

### Run the tests

```bash
npm test
```

Covers the agent loop, policy enforcement, the approval pause/resume flow, and
trace/cost recording.

---

## Architecture

```
┌──────────────────────┐
│   Web Console        │  Next.js / React / Tailwind   (apps/web)
└──────────┬───────────┘
           │  /api/* (rewrites)
┌──────────▼───────────┐
│   API                │  Fastify — auth, RBAC, routes (apps/api)
└───┬───────────┬──────┘
    │           │
┌───▼───────┐  ┌▼──────────────────────────┐
│ Control   │  │ Execution (data plane)    │
│ Plane     │  │  AgentRuntime — loop,     │
│ (agents,  │  │  state machine, checkpoints│
│  versions,│  │  RuntimeRepository         │
│  tools)   │  └───────┬───────────────────┘
└───────────┘          │
             ┌─────────▼─────────┐
             │  Policy Engine    │  deterministic authorization
             └─────────┬─────────┘
      ┌───────────────┼────────────────┐
      ▼               ▼                ▼
  LLM Gateway    Tool Runtime      (approvals)
  (mock/openai)  (retry/timeout)       │
                                  SQLite (node:sqlite)
```

Packages (workspaces) under `packages/`:

| Package | Responsibility |
| --- | --- |
| `core` | shared domain types, IDs, permissions |
| `db` | SQLite schema + connection (Postgres-swappable adapter point) |
| `llm-gateway` | model abstraction, mock + OpenAI providers, fallback |
| `policy-engine` | deterministic tool authorization |
| `tool-runtime` | tool execution with retry/timeout/idempotency |
| `runtime` | the agent loop, state machine, checkpoints, approvals, tracing |

### Key design decisions

- **The model proposes; the runtime disposes.** The LLM emits a structured tool
  call; the policy engine authorizes it; the runtime executes it. The model never
  touches infrastructure or secrets directly.
- **Deterministic execution over probabilistic reasoning.** Business-critical
  policies live outside the LLM in the policy engine (PRD §139–§140).
- **Fail closed.** Unknown tools, missing permissions, invalid args, and expired
  credentials are DENY by default; destructive ops require approval (PRD §98).
- **Durable execution.** Every step and state transition is persisted; the
  transcript is checkpointed so a run can resume after a pause or worker restart.
- **Swap-able storage.** SQLite (via `node:sqlite`) keeps the demo zero-dependency
  and runnable anywhere; the repository layer is a thin seam where PostgreSQL and
  Redis (queue) plug in later.

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for a deeper treatment and the
full subsystem roadmap.

---

## Repository structure

```
apps/
  api/        Fastify API + control plane + seed
  web/        Next.js console
packages/
  core/       shared types & utilities
  db/         SQLite schema + connection
  llm-gateway/  model providers
  policy-engine/  authorization
  tool-runtime/   tool execution
  runtime/    agent loop + durable execution
docs/
  ARCHITECTURE.md
```

---

## Product scope (roadmap)

The full product (196-section PRD) covers 12 subsystems. The vertical slice above
is the foundation; the remaining roadmap is staged:

1. **Foundation** — auth, orgs, DB, API, agents, LLM gateway ✅ *(this repo)*
2. **Agent runtime** — state machine, queue, retry, checkpointing ✅ *(this repo)*
3. **Integrations** — GitHub, Slack, PostgreSQL, HTTP, webhooks (partially stubbed)
4. **Workflow engine** — visual builder, triggers, conditions, parallel, approvals
5. **Governance** — policy engine, audit, secrets ✅ *(policy + audit present)*
6. **Observability** — OpenTelemetry, metrics, logs, cost ✅ *(traces + cost present)*
7. **Evaluation** — datasets, evaluators, regression gates (scaffolded)
8. **MCP** — client, tool discovery, authorization, server
9. **Advanced agents** — multi-agent, delegation, planning
10. **Enterprise** — SSO, SCIM, data residency, private deployment

## Stack

- **Frontend:** Next.js 15, React 19, TypeScript, Tailwind CSS
- **Backend:** Node.js, TypeScript, Fastify
- **Storage:** SQLite (Postgres-ready), in-process execution (Redis-ready queue)
- **Model layer:** mock (deterministic) + OpenAI-compatible provider

## License

Private portfolio project.
