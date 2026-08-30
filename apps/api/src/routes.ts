import type { FastifyInstance } from "fastify";
import type { Db } from "@agentos/db";
import type { EnvironmentName } from "@agentos/core";
import { ROLE_PERMISSIONS, type Permission } from "@agentos/core";
import type { ControlPlane } from "./control-plane.js";
import type { RuntimeRepository } from "@agentos/runtime";
import type { AgentRuntime } from "@agentos/runtime";
import { requireAuth, hashPassword, verifyPassword, issueToken } from "./auth.js";
import { defaultRuntimeConfig } from "./control-plane.js";

/**
 * HTTP routes (PRD §70). Base structure `/api/v1`.
 *
 * Route handlers are thin: they authenticate, authorize, validate a little,
 * delegate to the control plane or runtime, and serialize. Business logic
 * lives in the packages.
 */

export interface RouteDeps {
  db: Db;
  cp: ControlPlane;
  repo: RuntimeRepository;
  runtime: AgentRuntime;
  environment: EnvironmentName;
}

export function registerRoutes(app: FastifyInstance, deps: RouteDeps): void {
  const { cp, repo, runtime } = deps;

  const hasPermission = (userId: string, perm: Permission): boolean => {
    const user = cp.getUser(userId);
    if (!user) return false;
    return ROLE_PERMISSIONS[user.role].includes(perm);
  };

  // -- health --------------------------------------------------------------

  app.get("/api/health", async () => ({ ok: true, service: "agentos-api", environment: deps.environment }));

  // -- auth ----------------------------------------------------------------

  app.post("/api/v1/auth/register", async (req, reply) => {
    const body = req.body as { name?: string; email?: string; password?: string };
    if (!body?.email || !body?.password) {
      return reply.code(400).send({ error: "email and password are required" });
    }
    if (cp.getUserByEmail(body.email)) {
      return reply.code(409).send({ error: "email already registered" });
    }
    const org = cp.createOrganization(body.name ? `${body.name}'s Workspace` : "My Workspace");
    const user = cp.createUser({
      organizationId: org.id,
      email: body.email,
      name: body.name ?? body.email.split("@")[0]!,
      role: "owner",
      passwordHash: hashPassword(body.password),
    });
    return { token: issueToken(user.id), user: publicUser(user) };
  });

  app.post("/api/v1/auth/login", async (req, reply) => {
    const body = req.body as { email?: string; password?: string };
    const user = body?.email ? cp.getUserByEmail(body.email) : undefined;
    if (!user?.passwordHash || !body?.password || !verifyPassword(body.password, user.passwordHash)) {
      return reply.code(401).send({ error: "invalid credentials" });
    }
    return { token: issueToken(user.id), user: publicUser(user) };
  });

  app.get("/api/v1/auth/me", async (req) => {
    const user = requireAuth(req);
    return publicUser(user);
  });

  // -- agents --------------------------------------------------------------

  app.get("/api/v1/agents", async (req) => {
    const user = requireAuth(req);
    return cp.listAgents(user.organizationId).map(withCurrentVersion);
  });

  app.post("/api/v1/agents", async (req, reply) => {
    const user = requireAuth(req);
    if (!hasPermission(user.id, "agent:create")) return reply.code(403).send({ error: "forbidden" });
    const body = req.body as { name?: string; description?: string; projectId?: string };
    if (!body?.name) return reply.code(400).send({ error: "name is required" });
    const project = body.projectId
      ? cp.getProject(body.projectId)
      : cp.listProjects(user.organizationId)[0];
    if (!project) return reply.code(400).send({ error: "no project available — create a project first" });
    const agent = cp.createAgent({
      organizationId: user.organizationId,
      projectId: project.id,
      name: body.name,
      description: body.description ?? "",
    });
    return reply.code(201).send(agent);
  });

  app.get("/api/v1/agents/:id", async (req, reply) => {
    const user = requireAuth(req);
    const { id } = req.params as { id: string };
    const agent = cp.getAgent(id);
    if (!agent || agent.organizationId !== user.organizationId) return reply.code(404).send({ error: "not found" });
    const versions = cp.listVersions(agent.id);
    return { ...agent, versions };
  });

  app.patch("/api/v1/agents/:id", async (req, reply) => {
    const user = requireAuth(req);
    if (!hasPermission(user.id, "agent:update")) return reply.code(403).send({ error: "forbidden" });
    const { id } = req.params as { id: string };
    const agent = cp.getAgent(id);
    if (!agent || agent.organizationId !== user.organizationId) return reply.code(404).send({ error: "not found" });
    const body = req.body as { name?: string; description?: string; status?: any };
    return cp.updateAgent(id, { name: body.name, description: body.description, status: body.status });
  });

  app.delete("/api/v1/agents/:id", async (req, reply) => {
    const user = requireAuth(req);
    if (!hasPermission(user.id, "agent:delete")) return reply.code(403).send({ error: "forbidden" });
    const { id } = req.params as { id: string };
    const agent = cp.getAgent(id);
    if (!agent || agent.organizationId !== user.organizationId) return reply.code(404).send({ error: "not found" });
    cp.deleteAgent(id);
    return { ok: true };
  });

  // -- agent versions ------------------------------------------------------

  app.post("/api/v1/agents/:id/versions", async (req, reply) => {
    const user = requireAuth(req);
    if (!hasPermission(user.id, "agent:update")) return reply.code(403).send({ error: "forbidden" });
    const { id } = req.params as { id: string };
    const agent = cp.getAgent(id);
    if (!agent || agent.organizationId !== user.organizationId) return reply.code(404).send({ error: "not found" });
    const body = req.body as any;
    const version = cp.createVersion({
      agentId: agent.id,
      instructions: body.instructions ?? "",
      modelConfig: body.modelConfig ?? { model: "mock", provider: "mock", temperature: 0, maxTokens: 4096 },
      runtimeConfig: body.runtimeConfig ?? defaultRuntimeConfig(),
      toolIds: body.toolIds ?? [],
      policyConfig: body.policyConfig ?? [],
    });
    return reply.code(201).send(version);
  });

  // -- tools ---------------------------------------------------------------

  app.get("/api/v1/tools", async (req) => {
    const user = requireAuth(req);
    return cp.listTools(user.organizationId);
  });

  // -- runs ----------------------------------------------------------------

  app.post("/api/v1/agents/:id/runs", async (req, reply) => {
    const user = requireAuth(req);
    if (!hasPermission(user.id, "agent:execute")) return reply.code(403).send({ error: "forbidden" });
    const { id } = req.params as { id: string };
    const agent = cp.getAgent(id);
    if (!agent || agent.organizationId !== user.organizationId) return reply.code(404).send({ error: "not found" });
    const body = req.body as { input?: Record<string, unknown>; triggerType?: any };
    const run = await runtime.startRun({
      organizationId: user.organizationId,
      agentId: agent.id,
      runInput: body.input ?? {},
    }, { triggerType: body.triggerType ?? "api" });
    return reply.code(201).send(run);
  });

  app.get("/api/v1/runs", async (req) => {
    const user = requireAuth(req);
    const runs = repo.listRuns(user.organizationId, 200);
    return runs.map((r) => ({ ...r, agentName: cp.getAgent(r.agentId)?.name ?? r.agentId }));
  });

  app.get("/api/v1/runs/:id", async (req, reply) => {
    const user = requireAuth(req);
    const { id } = req.params as { id: string };
    const run = repo.getRun(id);
    if (!run || run.organizationId !== user.organizationId) return reply.code(404).send({ error: "not found" });
    const steps = repo.listSteps(id);
    const traces = repo.listTraces(id);
    const approvals = repo.listApprovals(user.organizationId).filter((a) => a.runId === id);
    return { ...run, agentName: cp.getAgent(run.agentId)?.name ?? run.agentId, steps, traces, approvals };
  });

  // -- approvals -----------------------------------------------------------

  app.get("/api/v1/approvals", async (req) => {
    const user = requireAuth(req);
    const approvals = repo.listApprovals(user.organizationId);
    return approvals.map((a) => ({
      ...a,
      agentName: cp.getAgent(a.agentId)?.name ?? a.agentId,
      runStatus: repo.getRun(a.runId)?.status,
    }));
  });

  app.post("/api/v1/approvals/:id/approve", async (req, reply) => {
    const user = requireAuth(req);
    if (!hasPermission(user.id, "approval:approve")) return reply.code(403).send({ error: "forbidden" });
    const { id } = req.params as { id: string };
    const approval = repo.getApproval(id);
    if (!approval) return reply.code(404).send({ error: "not found" });
    const run = repo.getRun(approval.runId);
    if (!run || run.organizationId !== user.organizationId) return reply.code(404).send({ error: "not found" });
    return runtime.resolveApproval(id, "APPROVED", user.id);
  });

  app.post("/api/v1/approvals/:id/reject", async (req, reply) => {
    const user = requireAuth(req);
    if (!hasPermission(user.id, "approval:approve")) return reply.code(403).send({ error: "forbidden" });
    const { id } = req.params as { id: string };
    const approval = repo.getApproval(id);
    if (!approval) return reply.code(404).send({ error: "not found" });
    const run = repo.getRun(approval.runId);
    if (!run || run.organizationId !== user.organizationId) return reply.code(404).send({ error: "not found" });
    return runtime.resolveApproval(id, "REJECTED", user.id);
  });

  // -- audit ---------------------------------------------------------------

  app.get("/api/v1/audit", async (req, reply) => {
    const user = requireAuth(req);
    if (!hasPermission(user.id, "audit:read")) return reply.code(403).send({ error: "forbidden" });
    return repo.listAudit(user.organizationId, 200);
  });

  // -- metrics / dashboard -------------------------------------------------

  app.get("/api/v1/metrics", async (req) => {
    const user = requireAuth(req);
    const runs = repo.listRuns(user.organizationId, 500);
    const approvals = repo.listApprovals(user.organizationId);
    const total = runs.length;
    const completed = runs.filter((r) => r.status === "COMPLETED").length;
    const failed = runs.filter((r) => r.status === "FAILED").length;
    const waiting = runs.filter((r) => r.status === "WAITING_APPROVAL").length;
    const running = runs.filter((r) => r.status === "RUNNING").length;
    const cost = runs.reduce((s, r) => s + r.estimatedCostUsd, 0);
    const tokens = runs.reduce((s, r) => s + r.tokenUsage, 0);
    const avgLatency = runs.filter((r) => r.durationMs != null).reduce((s, r) => s + (r.durationMs ?? 0), 0) / Math.max(1, completed);
    return {
      runsToday: total,
      successRate: total > 0 ? (completed / total) * 100 : 0,
      failed,
      running,
      waiting,
      pendingApprovals: approvals.filter((a) => a.status === "PENDING").length,
      cost,
      tokens,
      avgLatency,
      agents: cp.listAgents(user.organizationId).length,
      tools: cp.listTools(user.organizationId).length,
    };
  });

  // -- users / org ---------------------------------------------------------

  app.get("/api/v1/users", async (req) => {
    const user = requireAuth(req);
    return cp.listUsers(user.organizationId).map(publicUser);
  });

  app.get("/api/v1/organization", async (req) => {
    const user = requireAuth(req);
    return cp.getOrganization(user.organizationId);
  });

  app.get("/api/v1/projects", async (req) => {
    const user = requireAuth(req);
    return cp.listProjects(user.organizationId);
  });

  // -- eval ----------------------------------------------------------------

  app.get("/api/v1/eval/datasets", async (req) => {
    const user = requireAuth(req);
    const rows = deps.db.prepare<Record<string, unknown>>(`SELECT * FROM eval_datasets WHERE organization_id = ?`).all(user.organizationId);
    return rows.map((r) => ({ id: r.id, organizationId: r.organization_id, name: r.name, createdAt: r.created_at }));
  });

  app.get("/api/v1/eval/cases", async (req) => {
    const user = requireAuth(req);
    const rows = deps.db.prepare<Record<string, unknown>>(
      `SELECT c.* FROM eval_cases c JOIN eval_datasets d ON d.id = c.dataset_id WHERE d.organization_id = ? ORDER BY c.name ASC`,
    ).all(user.organizationId);
    return rows.map((r) => ({
      id: r.id,
      datasetId: r.dataset_id,
      name: r.name,
      input: JSON.parse(r.input as string),
      expectedTools: JSON.parse(r.expected_tools as string),
      expectedOutputContains: JSON.parse(r.expected_output_contains as string),
      constraints: JSON.parse(r.constraints as string),
    }));
  });
}

function publicUser(u: { id: string; organizationId: string; email: string; name: string; role: string; createdAt: string }) {
  return { id: u.id, organizationId: u.organizationId, email: u.email, name: u.name, role: u.role, createdAt: u.createdAt };
}

function withCurrentVersion(a: { currentVersionId: string | null }) {
  return a;
}
