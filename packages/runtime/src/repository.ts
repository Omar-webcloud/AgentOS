import type { Db } from "@agentos/db";
import type {
  Agent,
  AgentVersion,
  Approval,
  AuditEvent,
  ID,
  Run,
  RunStep,
  RunStatus,
  ToolDefinition,
  TraceSpan,
} from "@agentos/core";
import { makeId, nowIso } from "@agentos/core";

/**
 * SQLite-backed repository used by the runtime. This is the *data plane* half
 * of persistence: runs, steps, checkpoints, approvals, and traces. The control
 * plane (agents, versions, tools) is managed by the API's own repository.
 */

const json = (v: unknown): string => JSON.stringify(v ?? null);
const parse = <T>(s: unknown, fallback: T): T =>
  s == null ? fallback : (JSON.parse(s as string) as T);
/** JSON.parse that falls back to the raw string for non-JSON content. */
const tryParse = (s: unknown, fallback: unknown = null): unknown => {
  if (typeof s !== "string") return s ?? fallback;
  try {
    return JSON.parse(s);
  } catch {
    return s;
  }
};

export class RuntimeRepository {
  constructor(private db: Db) {}

  // -- runs ----------------------------------------------------------------

  createRun(input: {
    organizationId: ID;
    agentId: ID;
    agentVersionId: ID;
    triggerType: string;
    runInput: Record<string, unknown>;
  }): Run {
    const id = makeId("run");
    const run: Run = {
      id,
      organizationId: input.organizationId,
      agentId: input.agentId,
      agentVersionId: input.agentVersionId,
      status: "QUEUED",
      triggerType: input.triggerType as Run["triggerType"],
      input: input.runInput,
      output: null,
      error: null,
      startedAt: null,
      completedAt: null,
      durationMs: null,
      estimatedCostUsd: 0,
      tokenUsage: 0,
      createdAt: nowIso(),
    };
    this.db
      .prepare(
        `INSERT INTO runs (id, organization_id, agent_id, agent_version_id, status, trigger_type, input, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(id, input.organizationId, input.agentId, input.agentVersionId, "QUEUED", input.triggerType, json(input.runInput), run.createdAt);
    return run;
  }

  getRun(id: ID): Run | undefined {
    const row = this.db.prepare<Record<string, unknown>>(`SELECT * FROM runs WHERE id = ?`).get(id);
    return row ? mapRun(row) : undefined;
  }

  listRuns(organizationId: ID, limit = 100): Run[] {
    const rows = this.db
      .prepare<Record<string, unknown>>(
        `SELECT * FROM runs WHERE organization_id = ? ORDER BY created_at DESC LIMIT ?`,
      )
      .all(organizationId, limit);
    return rows.map(mapRun);
  }

  updateRun(id: ID, patch: Partial<Run>): void {
    const sets: string[] = [];
    const values: unknown[] = [];
    const fields: (keyof Run)[] = [
      "status",
      "output",
      "error",
      "startedAt",
      "completedAt",
      "durationMs",
      "estimatedCostUsd",
      "tokenUsage",
    ];
    for (const f of fields) {
      if (f in patch) {
        const col = camelToSnake(f as string);
        sets.push(`${col} = ?`);
        values.push(patch[f] === undefined ? null : typeof patch[f] === "object" ? json(patch[f]) : patch[f]);
      }
    }
    if (sets.length === 0) return;
    values.push(id);
    this.db.prepare(`UPDATE runs SET ${sets.join(", ")} WHERE id = ?`).run(...values);
  }

  // -- steps ---------------------------------------------------------------

  createStep(input: {
    runId: ID;
    sequence: number;
    type: RunStep["type"];
    toolId?: ID | null;
    stepInput?: unknown;
  }): RunStep {
    const step: RunStep = {
      id: makeId("step"),
      runId: input.runId,
      sequence: input.sequence,
      type: input.type,
      status: "PENDING",
      toolId: input.toolId ?? null,
      input: input.stepInput ?? null,
      output: null,
      error: null,
      startedAt: null,
      completedAt: null,
      durationMs: null,
      costUsd: 0,
    };
    this.db
      .prepare(
        `INSERT INTO run_steps (id, run_id, sequence, type, status, tool_id, input)
         VALUES (?, ?, ?, ?, 'PENDING', ?, ?)`,
      )
      .run(step.id, input.runId, input.sequence, input.type, input.toolId ?? null, json(input.stepInput ?? null));
    return step;
  }

  updateStep(id: ID, patch: Partial<RunStep>): void {
    const sets: string[] = [];
    const values: unknown[] = [];
    const fields: (keyof RunStep)[] = ["status", "output", "error", "startedAt", "completedAt", "durationMs", "costUsd"];
    for (const f of fields) {
      if (f in patch) {
        sets.push(`${camelToSnake(f as string)} = ?`);
        const v = patch[f];
        values.push(v === undefined ? null : typeof v === "object" ? json(v) : v);
      }
    }
    if (sets.length === 0) return;
    values.push(id);
    this.db.prepare(`UPDATE run_steps SET ${sets.join(", ")} WHERE id = ?`).run(...values);
  }

  listSteps(runId: ID): RunStep[] {
    const rows = this.db
      .prepare<Record<string, unknown>>(`SELECT * FROM run_steps WHERE run_id = ? ORDER BY sequence ASC`)
      .all(runId);
    return rows.map(mapStep);
  }

  // -- approvals -----------------------------------------------------------

  createApproval(input: {
    runId: ID;
    stepId: ID | null;
    agentId: ID;
    action: string;
    riskLevel: string;
    payload: Record<string, unknown>;
    ttlMs?: number;
  }): Approval {
    const approval: Approval = {
      id: makeId("approval"),
      runId: input.runId,
      stepId: input.stepId,
      agentId: input.agentId,
      action: input.action,
      riskLevel: input.riskLevel as Approval["riskLevel"],
      payload: input.payload,
      status: "PENDING",
      expiresAt: input.ttlMs ? new Date(Date.now() + input.ttlMs).toISOString() : null,
      createdAt: nowIso(),
      resolvedAt: null,
      resolvedBy: null,
    };
    this.db
      .prepare(
        `INSERT INTO approvals (id, run_id, step_id, agent_id, action, risk_level, payload, status, expires_at, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING', ?, ?)`,
      )
      .run(approval.id, input.runId, input.stepId, input.agentId, input.action, input.riskLevel, json(input.payload), approval.expiresAt, approval.createdAt);
    return approval;
  }

  getApproval(id: ID): Approval | undefined {
    const row = this.db.prepare<Record<string, unknown>>(`SELECT * FROM approvals WHERE id = ?`).get(id);
    return row ? mapApproval(row) : undefined;
  }

  listApprovals(organizationId?: ID, status?: string): Approval[] {
    const rows = organizationId
      ? this.db
          .prepare<Record<string, unknown>>(
            `SELECT a.* FROM approvals a JOIN runs r ON r.id = a.run_id WHERE r.organization_id = ? AND (a.status = ? OR ? IS NULL) ORDER BY a.created_at DESC`,
          )
          .all(organizationId, status ?? null, status ?? null)
      : this.db
          .prepare<Record<string, unknown>>(`SELECT * FROM approvals WHERE (status = ? OR ? IS NULL) ORDER BY created_at DESC`)
          .all(status ?? null, status ?? null);
    return rows.map(mapApproval);
  }

  updateApproval(id: ID, patch: Partial<Approval>): void {
    const sets: string[] = [];
    const values: unknown[] = [];
    const fields: (keyof Approval)[] = ["status", "resolvedAt", "resolvedBy"];
    for (const f of fields) {
      if (f in patch) {
        sets.push(`${camelToSnake(f as string)} = ?`);
        values.push(patch[f] ?? null);
      }
    }
    if (sets.length === 0) return;
    values.push(id);
    this.db.prepare(`UPDATE approvals SET ${sets.join(", ")} WHERE id = ?`).run(...values);
  }

  // -- checkpoints ---------------------------------------------------------

  saveCheckpoint(runId: ID, state: unknown): void {
    const stepIndex = (state as { stepIndex?: number }).stepIndex ?? 0;
    this.db
      .prepare(
        `INSERT INTO checkpoints (run_id, step_index, state, updated_at) VALUES (?, ?, ?, ?)
         ON CONFLICT(run_id) DO UPDATE SET step_index = excluded.step_index, state = excluded.state, updated_at = excluded.updated_at`,
      )
      .run(runId, stepIndex, json(state), nowIso());
  }

  loadCheckpoint(runId: ID): unknown | undefined {
    const row = this.db.prepare<Record<string, unknown>>(`SELECT state FROM checkpoints WHERE run_id = ?`).get(runId);
    return row ? parse(row.state, undefined) : undefined;
  }

  clearCheckpoint(runId: ID): void {
    this.db.prepare(`DELETE FROM checkpoints WHERE run_id = ?`).run(runId);
  }

  // -- traces --------------------------------------------------------------

  createSpan(span: Omit<TraceSpan, "id">): TraceSpan {
    const full: TraceSpan = { ...span, id: makeId("span") };
    this.db
      .prepare(
        `INSERT INTO traces (id, run_id, name, kind, parent_id, started_at, duration_ms, attributes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(full.id, full.runId, full.name, full.kind, full.parentId, full.startedAt, full.durationMs, json(full.attributes));
    return full;
  }

  listTraces(runId: ID): TraceSpan[] {
    const rows = this.db
      .prepare<Record<string, unknown>>(`SELECT * FROM traces WHERE run_id = ? ORDER BY started_at ASC`)
      .all(runId);
    return rows.map((r) => ({
      id: r.id as ID,
      runId: r.run_id as ID,
      name: r.name as string,
      kind: r.kind as string,
      parentId: (r.parent_id as ID | null) ?? null,
      startedAt: r.started_at as string,
      durationMs: r.duration_ms as number,
      attributes: parse(r.attributes, {}),
    }));
  }

  // -- audit ---------------------------------------------------------------

  recordAudit(event: Omit<AuditEvent, "id" | "createdAt">): AuditEvent {
    const full: AuditEvent = { ...event, id: makeId("audit"), createdAt: nowIso() };
    this.db
      .prepare(
        `INSERT INTO audit_logs (id, organization_id, actor, resource, action, result, metadata, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(full.id, full.organizationId, full.actor, full.resource, full.action, full.result, json(full.metadata), full.createdAt);
    return full;
  }

  listAudit(organizationId: ID, limit = 200): AuditEvent[] {
    const rows = this.db
      .prepare<Record<string, unknown>>(
        `SELECT * FROM audit_logs WHERE organization_id = ? ORDER BY created_at DESC LIMIT ?`,
      )
      .all(organizationId, limit);
    return rows.map((r) => ({
      id: r.id as ID,
      organizationId: r.organization_id as ID,
      actor: (r.actor as ID | null) ?? null,
      resource: r.resource as string,
      action: r.action as string,
      result: r.result as AuditEvent["result"],
      metadata: parse(r.metadata, {}),
      createdAt: r.created_at as string,
    }));
  }
}

// --- row mappers -----------------------------------------------------------

function mapRun(r: Record<string, unknown>): Run {
  return {
    id: r.id as ID,
    organizationId: r.organization_id as ID,
    agentId: r.agent_id as ID,
    agentVersionId: r.agent_version_id as ID,
    status: r.status as RunStatus,
    triggerType: r.trigger_type as Run["triggerType"],
    input: parse(r.input, {}),
    output: r.output == null ? null : tryParse(r.output),
    error: (r.error as string | null) ?? null,
    startedAt: (r.started_at as string | null) ?? null,
    completedAt: (r.completed_at as string | null) ?? null,
    durationMs: (r.duration_ms as number | null) ?? null,
    estimatedCostUsd: (r.estimated_cost_usd as number) ?? 0,
    tokenUsage: (r.token_usage as number) ?? 0,
    createdAt: r.created_at as string,
  };
}

function mapStep(r: Record<string, unknown>): RunStep {
  return {
    id: r.id as ID,
    runId: r.run_id as ID,
    sequence: r.sequence as number,
    type: r.type as RunStep["type"],
    status: r.status as RunStep["status"],
    toolId: (r.tool_id as ID | null) ?? null,
    input: r.input == null ? null : tryParse(r.input),
    output: r.output == null ? null : tryParse(r.output),
    error: (r.error as string | null) ?? null,
    startedAt: (r.started_at as string | null) ?? null,
    completedAt: (r.completed_at as string | null) ?? null,
    durationMs: (r.duration_ms as number | null) ?? null,
    costUsd: (r.cost_usd as number) ?? 0,
  };
}

function mapApproval(r: Record<string, unknown>): Approval {
  return {
    id: r.id as ID,
    runId: r.run_id as ID,
    stepId: (r.step_id as ID | null) ?? null,
    agentId: r.agent_id as ID,
    action: r.action as string,
    riskLevel: r.risk_level as Approval["riskLevel"],
    payload: parse(r.payload, {}),
    status: r.status as Approval["status"],
    expiresAt: (r.expires_at as string | null) ?? null,
    createdAt: r.created_at as string,
    resolvedAt: (r.resolved_at as string | null) ?? null,
    resolvedBy: (r.resolved_by as ID | null) ?? null,
  };
}

function camelToSnake(s: string): string {
  return s.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
}
