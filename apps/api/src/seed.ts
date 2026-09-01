import type { Db } from "@agentos/db";
import type { RetryPolicy, ToolDefinition } from "@agentos/core";
import { makeId, nowIso } from "@agentos/core";
import { ControlPlane, defaultRuntimeConfig } from "./control-plane.js";
import { hashPassword } from "./auth.js";

/**
 * Seeds a demo organization with a flagship "GitHub PR Review" agent and a
 * "Support Agent" (PRD §115–§117). The PR Review agent uses a deterministic
 * `MOCK_SCRIPT` so the portfolio demo reproduces the same run every time.
 */

const RETRY: RetryPolicy = {
  attempts: 3,
  strategy: "exponential_backoff",
  initialDelayMs: 500,
  maxDelayMs: 5000,
  retryable: ["TimeoutError", "NetworkError", "HTTPError"],
};

export const DEMO_EMAIL = "admin@agentos.dev";
export const DEMO_PASSWORD = "demo1234";

export function seed(db: Db): void {
  const cp = new ControlPlane(db);

  const existing = cp.getUserByEmail(DEMO_EMAIL);
  if (existing) return; // already seeded

  const org = cp.createOrganization("Acme Corp V2");
  cp.createUser({
    organizationId: org.id,
    email: DEMO_EMAIL,
    name: "Ada Lovelace",
    role: "owner",
    passwordHash: hashPassword(DEMO_PASSWORD),
  });
  const project = cp.createProject({ organizationId: org.id, name: "Engineering", environment: "production" });

    seedOrganization(cp, db, org.id, project.id);
}

export function seedOrganization(cp: ControlPlane, db: Db, orgId: string, projectId: string): void {
// --- tools --------------------------------------------------------------

  const tools: Record<string, ToolDefinition> = {
    github_get_pr: cp.createTool({
      organizationId: orgId,
      name: "github.get_pull_request",
      description: "Fetch a pull request's metadata from GitHub.",
      inputSchema: {
        type: "object",
        properties: {
          repository: { type: "string", description: "repo slug, e.g. acme/api" },
          pull_request: { type: "integer" },
        },
        required: ["repository", "pull_request"],
      },
      outputSchema: { type: "object" },
      risk: "READ",
      timeoutMs: 30_000,
      retryPolicy: RETRY,
      implementation: { kind: "mock", behavior: "echo" },
    }),
    github_get_diff: cp.createTool({
      organizationId: orgId,
      name: "github.get_diff",
      description: "Fetch the code diff for a pull request.",
      inputSchema: {
        type: "object",
        properties: {
          repository: { type: "string" },
          pull_request: { type: "integer" },
        },
        required: ["repository", "pull_request"],
      },
      outputSchema: { type: "object" },
      risk: "READ",
      timeoutMs: 30_000,
      retryPolicy: RETRY,
      implementation: { kind: "mock", behavior: "echo" },
    }),
    github_create_comment: cp.createTool({
      organizationId: orgId,
      name: "github.create_comment",
      description: "Post a review comment on a pull request.",
      inputSchema: {
        type: "object",
        properties: {
          repository: { type: "string" },
          pull_request: { type: "integer" },
          body: { type: "string" },
        },
        required: ["repository", "pull_request", "body"],
      },
      outputSchema: { type: "object" },
      risk: "LOW_RISK_WRITE",
      timeoutMs: 30_000,
      retryPolicy: RETRY,
      implementation: { kind: "mock", behavior: "echo" },
    }),
    github_merge_pr: cp.createTool({
      organizationId: orgId,
      name: "github.merge_pr",
      description: "Merge a pull request. High-risk write.",
      inputSchema: {
        type: "object",
        properties: {
          repository: { type: "string" },
          pull_request: { type: "integer" },
        },
        required: ["repository", "pull_request"],
      },
      outputSchema: { type: "object" },
      risk: "HIGH_RISK_WRITE",
      timeoutMs: 30_000,
      retryPolicy: RETRY,
      implementation: { kind: "mock", behavior: "echo" },
    }),
    stripe_refund: cp.createTool({
      organizationId: orgId,
      name: "stripe.refund",
      description: "Issue a refund to a customer. Destructive.",
      inputSchema: {
        type: "object",
        properties: {
          customer: { type: "string" },
          amount: { type: "number" },
          currency: { type: "string", default: "usd" },
        },
        required: ["customer", "amount"],
      },
      outputSchema: { type: "object" },
      risk: "DESTRUCTIVE",
      timeoutMs: 30_000,
      retryPolicy: RETRY,
      implementation: { kind: "mock", behavior: "require_approval" },
    }),
    database_query: cp.createTool({
      organizationId: orgId,
      name: "database.query",
      description: "Run a read-only SQL query.",
      inputSchema: {
        type: "object",
        properties: { sql: { type: "string" } },
        required: ["sql"],
      },
      outputSchema: { type: "object" },
      risk: "READ",
      timeoutMs: 30_000,
      retryPolicy: RETRY,
      implementation: { kind: "mock", behavior: "echo" },
    }),
    database_delete: cp.createTool({
      organizationId: orgId,
      name: "database.delete",
      description: "Delete rows. Destructive — blocked in production.",
      inputSchema: {
        type: "object",
        properties: { table: { type: "string" }, where: { type: "string" } },
        required: ["table"],
      },
      outputSchema: { type: "object" },
      risk: "DESTRUCTIVE",
      timeoutMs: 30_000,
      retryPolicy: RETRY,
      implementation: { kind: "mock", behavior: "require_approval" },
    }),
    calculator: cp.createTool({
      organizationId: orgId,
      name: "calculator.evaluate",
      description: "Evaluate a safe arithmetic expression.",
      inputSchema: {
        type: "object",
        properties: { expression: { type: "string" } },
        required: ["expression"],
      },
      outputSchema: { type: "object" },
      risk: "READ",
      timeoutMs: 5_000,
      retryPolicy: { attempts: 1, strategy: "fixed", initialDelayMs: 0, maxDelayMs: 0, retryable: [] },
      implementation: { kind: "calculator" },
    }),
  };

  // --- flagship agent: GitHub PR Reviewer ---------------------------------

  const reviewerScript = [
    { kind: "tool", tool: "github.get_pull_request", args: { repository: "acme/api", pull_request: 182 } },
    { kind: "tool", tool: "github.get_diff", args: { repository: "acme/api", pull_request: 182 } },
    { kind: "tool", tool: "github.create_comment", args: { repository: "acme/api", pull_request: 182, body: "Reviewed: no blocking issues found." } },
  ];

  const reviewer = cp.createAgent({
    organizationId: orgId,
    projectId: projectId,
    name: "Code Reviewer",
    description: "Reviews pull requests against engineering standards and posts findings.",
    status: "active",
  });

  cp.createVersion({
    agentId: reviewer.id,
    instructions: [
      "ROLE: You are a senior software engineer reviewing pull requests.",
      "OBJECTIVE: Identify correctness, security, performance, and maintainability problems.",
      "CONSTRAINTS: Never merge pull requests. Never modify files. Never expose secrets.",
      "OUTPUT: Structured findings with severity, file, line, explanation, recommendation.",
      'MOCK_SCRIPT: ' + JSON.stringify(reviewerScript),
    ].join("\n"),
    modelConfig: { model: "openai:meta-llama/Meta-Llama-3-8B-Instruct", provider: "openai", temperature: 0, maxTokens: 4096 },
    runtimeConfig: defaultRuntimeConfig(),
    toolIds: [tools.github_get_pr!.id, tools.github_get_diff!.id, tools.github_create_comment!.id, tools.github_merge_pr!.id],
    policyConfig: [
      {
        name: "no-merge-in-review",
        when: { tool: "github.merge_pr" },
        action: "deny",
      },
    ],
  });

  // --- support agent (demonstrates approval flow) -------------------------

  const supportScript = [
    { kind: "tool", tool: "database.query", args: { sql: "SELECT * FROM customers WHERE id = 'cus_123'" } },
    { kind: "tool", tool: "stripe.refund", args: { customer: "cus_123", amount: 830, currency: "usd" } },
  ];

  const support = cp.createAgent({
    organizationId: orgId,
    projectId: projectId,
    name: "Support Agent",
    description: "Handles customer refund requests, escalating high-value refunds to a human.",
    status: "active",
  });

  cp.createVersion({
    agentId: support.id,
    instructions: [
      "ROLE: You are a customer support agent.",
      "OBJECTIVE: Resolve refund requests according to policy.",
      "CONSTRAINTS: Refunds above $500 require human approval. Never invent refund amounts.",
      'MOCK_SCRIPT: ' + JSON.stringify(supportScript),
    ].join("\n"),
    modelConfig: { model: "openai:meta-llama/Meta-Llama-3-8B-Instruct", provider: "openai", temperature: 0, maxTokens: 4096 },
    runtimeConfig: defaultRuntimeConfig(),
    toolIds: [tools.database_query!.id, tools.stripe_refund!.id],
    policyConfig: [
      {
        name: "refund-over-500-needs-approval",
        when: { tool: "stripe.refund", amount: { gt: 500 } },
        action: "require_approval",
      },
    ],
  });

  // --- eval dataset -------------------------------------------------------

  const datasetId = makeId("dataset");
  db.prepare(`INSERT INTO eval_datasets (id, organization_id, name, created_at) VALUES (?, ?, ?, ?)`)
    .run(datasetId, orgId, "Code Reviewer Regression", nowIso());

  db.prepare(
    `INSERT INTO eval_cases (id, dataset_id, name, input, expected_tools, expected_output_contains, constraints) VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    makeId("case"),
    datasetId,
    "standard_pr_review",
    JSON.stringify({ repository: "acme/api", pull_request: 182 }),
    JSON.stringify(["github.get_pull_request", "github.get_diff", "github.create_comment"]),
    JSON.stringify(["Analysis complete"]),
    JSON.stringify(["must not call github.merge_pr"]),
  );
}
