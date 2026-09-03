/**
 * Core domain types shared across AgentOS packages.
 *
 * The runtime/API persist these shapes; the UI renders them. Keeping them in
 * one place is what lets the control plane, execution plane, and web console
 * agree on a single contract (PRD §12–§95).
 */

export type ID = string;

// ---------------------------------------------------------------------------
// Tenancy (PRD §10)
// ---------------------------------------------------------------------------

export interface Organization {
  id: ID;
  name: string;
  slug: string;
  createdAt: string;
}

export interface Project {
  id: ID;
  organizationId: ID;
  name: string;
  environment: EnvironmentName;
  createdAt: string;
}

export type EnvironmentName = "development" | "staging" | "production";

// ---------------------------------------------------------------------------
// Identity / roles (PRD §9, §11)
// ---------------------------------------------------------------------------

export type Role = "owner" | "admin" | "developer" | "operator" | "viewer";

export type AuthProvider = "password" | "google";

/** The three brains people sign up with (each via their Google account). */
export type BrainId = "chatgpt" | "gemini" | "grok";

export interface User {
  id: ID;
  organizationId: ID;
  email: string;
  name: string;
  role: Role;
  passwordHash: string | null;
  googleId: string | null;
  avatarUrl: string | null;
  authProvider: AuthProvider;
  createdAt: string;
}

export interface ConnectedProvider {
  id: ID;
  userId: ID;
  organizationId: ID;
  provider: BrainId;
  googleEmail: string;
  googleId: string | null;
  status: "connected" | "disconnected";
  connectedAt: string;
}

/** Permission strings such as `agent:create`, `run:read`, `approval:approve`. */
export type Permission =
  | "agent:create"
  | "agent:read"
  | "agent:update"
  | "agent:delete"
  | "agent:execute"
  | "run:read"
  | "tool:read"
  | "approval:approve"
  | "integration:manage"
  | "audit:read";

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  owner: [
    "agent:create",
    "agent:read",
    "agent:update",
    "agent:delete",
    "agent:execute",
    "run:read",
    "tool:read",
    "approval:approve",
    "integration:manage",
    "audit:read",
  ],
  admin: [
    "agent:create",
    "agent:read",
    "agent:update",
    "agent:delete",
    "agent:execute",
    "run:read",
    "tool:read",
    "approval:approve",
    "integration:manage",
    "audit:read",
  ],
  developer: [
    "agent:create",
    "agent:read",
    "agent:update",
    "agent:execute",
    "run:read",
    "tool:read",
    "approval:approve",
    "audit:read",
  ],
  operator: ["agent:read", "agent:execute", "run:read", "tool:read", "audit:read"],
  viewer: ["agent:read", "run:read", "tool:read"],
};

// ---------------------------------------------------------------------------
// Agents & versions (PRD §12–§15, §47)
// ---------------------------------------------------------------------------

export type AgentStatus =
  | "draft"
  | "testing"
  | "active"
  | "paused"
  | "deprecated"
  | "archived";

export interface Agent {
  id: ID;
  organizationId: ID;
  projectId: ID;
  name: string;
  slug: string;
  description: string;
  status: AgentStatus;
  currentVersionId: ID | null;
  createdAt: string;
  updatedAt: string;
}

export interface ModelConfig {
  /** Logical model reference, e.g. "mock" | "openai:gpt-4o-mini" (PRD §16). */
  model: string;
  provider: string;
  temperature: number;
  maxTokens: number;
}

export interface RuntimeConfig {
  maxIterations: number;
  maxExecutionTimeMs: number;
  maxCostUsd: number;
  tokenBudget: number;
  maxToolCalls: number;
  maxDelegationDepth: number;
}

export interface AgentVersion {
  id: ID;
  agentId: ID;
  version: number;
  instructions: string;
  modelConfig: ModelConfig;
  runtimeConfig: RuntimeConfig;
  toolIds: ID[];
  policyConfig: PolicyRule[];
  status: "draft" | "published" | "archived";
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Tools (PRD §18–§21)
// ---------------------------------------------------------------------------

export type ToolRisk = "READ" | "LOW_RISK_WRITE" | "HIGH_RISK_WRITE" | "DESTRUCTIVE";

export interface ToolDefinition {
  id: ID;
  organizationId: ID;
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  outputSchema: Record<string, unknown>;
  risk: ToolRisk;
  timeoutMs: number;
  retryPolicy: RetryPolicy;
  /** Implementation kind resolved by the tool-runtime. */
  implementation: ToolImplementation;
}

export type ToolImplementation =
  | { kind: "mock"; behavior: "echo" | "fail" | "slow" | "require_approval" }
  | { kind: "http"; method: string; url: string }
  | { kind: "calculator" };

// ---------------------------------------------------------------------------
// Execution (PRD §28–§33, §93–§94)
// ---------------------------------------------------------------------------

export type RunStatus =
  | "QUEUED"
  | "RUNNING"
  | "WAITING_APPROVAL"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED"
  | "TIMED_OUT";

export type StepStatus = "PENDING" | "RUNNING" | "SUCCEEDED" | "FAILED" | "SKIPPED";

export type RunTriggerType = "manual" | "api" | "schedule" | "event";

export interface Run {
  id: ID;
  organizationId: ID;
  agentId: ID;
  agentVersionId: ID;
  status: RunStatus;
  triggerType: RunTriggerType;
  input: Record<string, unknown>;
  output: unknown | null;
  error: string | null;
  startedAt: string | null;
  completedAt: string | null;
  durationMs: number | null;
  estimatedCostUsd: number;
  tokenUsage: number;
  createdAt: string;
}

export interface RunStep {
  id: ID;
  runId: ID;
  sequence: number;
  type:
    | "plan"
    | "llm"
    | "tool"
    | "retrieval"
    | "approval"
    | "final"
    | "error";
  status: StepStatus;
  toolId: ID | null;
  input: unknown;
  output: unknown;
  error: string | null;
  startedAt: string | null;
  completedAt: string | null;
  durationMs: number | null;
  costUsd: number;
}

// ---------------------------------------------------------------------------
// Approvals (PRD §35–§38, §95)
// ---------------------------------------------------------------------------

export type ApprovalStatus = "PENDING" | "APPROVED" | "REJECTED" | "EXPIRED";

export interface Approval {
  id: ID;
  runId: ID;
  stepId: ID | null;
  agentId: ID;
  action: string;
  riskLevel: ToolRisk;
  payload: Record<string, unknown>;
  status: ApprovalStatus;
  expiresAt: string | null;
  createdAt: string;
  resolvedAt: string | null;
  resolvedBy: ID | null;
}

// ---------------------------------------------------------------------------
// Policies (PRD §96–§98)
// ---------------------------------------------------------------------------

export type PolicyAction = "allow" | "deny" | "require_approval";

export interface PolicyRule {
  name: string;
  when: {
    tool?: string;
    risk?: ToolRisk;
    environment?: EnvironmentName;
    amount?: { gt?: number; gte?: number; lt?: number };
    path?: string;
  };
  action: PolicyAction;
}

// ---------------------------------------------------------------------------
// Evaluation (PRD §52–§57)
// ---------------------------------------------------------------------------

export interface EvaluationCase {
  id: ID;
  datasetId: ID;
  name: string;
  input: Record<string, unknown>;
  expectedTools: string[];
  expectedOutputContains: string[];
  constraints: string[];
}

export interface EvaluationResult {
  id: ID;
  caseId: ID;
  runId: ID | null;
  passed: boolean;
  toolAccuracy: number;
  policyCompliant: boolean;
  latencyMs: number;
  costUsd: number;
  notes: string;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Misc
// ---------------------------------------------------------------------------

export interface RetryPolicy {
  attempts: number;
  strategy: "exponential_backoff" | "fixed";
  initialDelayMs: number;
  maxDelayMs: number;
  /** Errors matching these classes are retryable; others fail fast (PRD §33). */
  retryable: string[];
}

export type AuditResult = "allow" | "deny" | "approval" | "success" | "failure";

export interface AuditEvent {
  id: ID;
  organizationId: ID;
  actor: ID | null;
  resource: string;
  action: string;
  result: AuditResult;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface TraceSpan {
  id: ID;
  runId: ID;
  name: string;
  kind: string;
  parentId: ID | null;
  startedAt: string;
  durationMs: number;
  attributes: Record<string, unknown>;
}
