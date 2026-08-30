# AgentOS Architecture

This document describes the implemented architecture and the reasoning behind
the key decisions. It is the technical companion to the product PRD.

## 1. Control plane vs. data plane

The PRD mandates a separation between configuration and execution. The codebase
preserves this boundary:

- **Control plane** (`apps/api/src/control-plane.ts`) — organizations, users,
  projects, agents, agent versions, tools. Queried by the API, mostly
  synchronous, low write volume.
- **Data plane** (`packages/runtime/src/repository.ts`) — runs, run steps,
  checkpoints, approvals, traces, audit events. High write volume, hot path.

The API composes both: routes read the control plane, and the `AgentRuntime`
writes to the data plane during execution.

## 2. The execution contract

The core loop (PRD §191) is implemented in `packages/runtime/src/runtime.ts`:

```
INPUT (task, agent, version, environment, budget, policies)
  ↓
loop:
  build context (system prompt + tool schemas + transcript)
  → LLM decides: tool call | final answer
  → if tool call:
      authorize via policy engine
      if deny        → fail run
      if approval    → persist approval, pause (WAITING_APPROVAL)
      if allow       → execute with retry/timeout/idempotency
  → persist checkpoint after every step
  → enforce budgets (cost, tokens, iterations)
  ↓
OUTPUT (result, trace, cost, audit record)
```

### Why the mock LLM is deterministic

The `mock` provider (in `packages/llm-gateway`) parses a `MOCK_SCRIPT:` directive
from the agent instructions and replays a fixed sequence of tool calls. This gives:

- **Reproducibility** — the same run produces the same trace, which matters for
  evaluation and regression testing (PRD §145–§147).
- **Zero-key demos** — the platform runs without any external API credentials.
- **A clean seam** — swapping in a real provider only changes the gateway, not
  the runtime.

## 3. Authorization model (zero-trust tools)

The LLM never invokes a tool directly. Every proposed call flows through
`packages/policy-engine`:

```
LLM: "call stripe.refund { amount: 830 }"
  ↓
PolicyEngine.evaluatePolicy({
  toolName, risk, environment, args
}, version.policyConfig)
  ↓
ALLOW | DENY | REQUIRE_APPROVAL
```

- Rules are declarative (`when: { tool, risk, environment, amount }` → `action`).
- Precedence is **most restrictive wins** (PRD §97).
- Defaults **fail closed**: destructive ops require approval; unknown tools deny.
- Every decision is written to the append-only audit log.

## 4. Durable execution & approvals

Runs are checkpointed after every step. The checkpoint stores the transcript
(messages), step index, iteration count, and accumulated cost/tokens.

When a tool call requires approval:

1. The run is persisted as `WAITING_APPROVAL` with a pending `Approval` row.
2. The worker returns; nothing executes without consent.
3. On `approve`, the runtime executes the now-authorized tool, appends its result
   to the transcript, and resumes the loop from the checkpoint.
4. On `reject`, the run **fails closed** with a clear error.

Approvals carry a default 15-minute TTL (PRD §38) and record who resolved them.

## 5. Storage & swapping backends

`packages/db` uses Node's built-in `node:sqlite` so the demo runs with zero
infrastructure. The schema (in `packages/db/src/schema.ts`) mirrors the Postgres
model in the PRD (organizations, agents, agent_versions, runs, run_steps,
approvals, audit_logs, traces, …). The repository classes are the adapter seam:

- `RuntimeRepository` (data plane) and `ControlPlane` (control plane) encapsulate
  all SQL. Swapping to Postgres means reimplementing these two classes.
- The queue/worker is currently in-process; the PRD targets a dedicated queue
  (Redis-backed) with horizontal worker scaling. The `AgentRuntime` is already
  stateless w.r.t. workers — all state lives in checkpoints — so it can move
  behind a queue without redesign.

## 6. Observability

Every meaningful operation produces a structured `TraceSpan` (agent invoke, LLM
call, tool call, approval). Spans carry attributes for cost, token usage, provider,
and risk. The PRD specifies OpenTelemetry-aligned GenAI conventions; the span
model here maps cleanly onto that (`invoke_agent`, `execute_tool`, `gen_ai.*`).

Sensitive-content capture is deliberately minimal: tool *arguments* and *results*
are stored as step inputs/outputs but the model prompt/completion bodies are not
retained by default (PRD §60).

## 7. What's intentionally out of scope for this slice

- **Workflow engine** (visual builder, triggers, parallelism) — next milestone.
- **MCP** client/server — Phase 8.
- **Multi-agent delegation** — Phase 9.
- **SSO/SCIM/enterprise** — Phase 10.
- **Code sandbox** — Phase 2/3, never in the API server (PRD §100).
