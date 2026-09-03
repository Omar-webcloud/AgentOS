import type { FastifyInstance } from "fastify";
import type { Db } from "@agentos/db";
import type { EnvironmentName } from "@agentos/core";
import { ROLE_PERMISSIONS, isBrainId, type Permission } from "@agentos/core";
import type { ControlPlane } from "./control-plane.js";
import type { RuntimeRepository } from "@agentos/runtime";
import type { AgentRuntime } from "@agentos/runtime";
import { requireAuth, hashPassword, verifyPassword, issueToken } from "./auth.js";
import { defaultRuntimeConfig } from "./control-plane.js";
import { seedOrganization } from "./seed.js";

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
  /** Names of the LLM providers the gateway was started with. */
  providers?: string[];
  /** Resolved SQLite file (or `:memory:`), reported by /api/v1/diagnostics. */
  databasePath?: string;
}

export function registerRoutes(app: FastifyInstance, deps: RouteDeps): void {
  const { cp, repo, runtime } = deps;

  const hasPermission = (userId: string, perm: Permission): boolean => {
    const user = cp.getUser(userId);
    if (!user) return false;
    return ROLE_PERMISSIONS[user.role].includes(perm);
  };

  // -- health --------------------------------------------------------------

  app.get("/api/health", async () => ({
    ok: true,
    service: "agentos-api",
    environment: deps.environment,
    // Which LLM providers the gateway came up with. `mock` is always present;
    // `openai` appears only when an API key (OpenAI or Hugging Face) is set,
    // which makes "did my key actually load?" answerable without a redeploy.
    llmProviders: deps.providers ?? [],
  }));

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
    const project = cp.createProject({ organizationId: org.id, name: "Engineering", environment: "production" });
    const user = cp.createUser({
      organizationId: org.id,
      email: body.email,
      name: body.name ?? body.email.split("@")[0]!,
      role: "owner",
      passwordHash: hashPassword(body.password),
    });
    
    // Seed default models, tools, and datasets for the new organization
    seedOrganization(cp, deps.db, org.id, project.id);
    
    return { token: issueToken(user.id), user: publicUser(user) };
  });

  app.post("/api/v1/auth/login", async (req, reply) => {
    const body = req.body as { email?: string; password?: string };
    const user = body?.email ? cp.getUserByEmail(body.email) : undefined;
    if (!user?.passwordHash || !body?.password || !verifyPassword(body.password, user.passwordHash)) {
      return reply.code(401).send({ error: "invalid credentials" });
    }
    return { token: issueToken(user.id), user: publicUser(user), providers: cp.listProviders(user.id) };
  });

  /**
   * Sign up / sign in with Google, optionally connecting ChatGPT, Gemini, or Grok
   * in the same step. When `GOOGLE_CLIENT_ID` is set, an ID token is required and
   * verified against Google. Otherwise this is a demo Google Sign-In (portfolio).
   */
  app.post("/api/v1/auth/google", async (req, reply) => {
    const body = req.body as {
      email?: string;
      name?: string;
      picture?: string;
      googleId?: string;
      idToken?: string;
      brain?: string;
    };

    let profile: { email: string; name: string; picture?: string; googleId?: string };
    try {
      profile = body.idToken
        ? await verifyGoogleIdToken(body.idToken)
        : demoGoogleProfile(body);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Google sign-in failed";
      return reply.code(401).send({ error: message });
    }
    if (!profile) return;

    const brain = isBrainId(body.brain) ? body.brain : undefined;
    const email = profile.email.toLowerCase();

    let user = cp.getUserByEmail(email);
    let created = false;
    if (!user) {
      const org = cp.createOrganization(`${profile.name}'s Workspace`);
      const project = cp.createProject({ organizationId: org.id, name: "Agents", environment: "production" });
      user = cp.createUser({
        organizationId: org.id,
        email,
        name: profile.name,
        role: "owner",
        passwordHash: null,
        googleId: profile.googleId ?? null,
        avatarUrl: profile.picture ?? null,
        authProvider: "google",
      });
      seedOrganization(cp, deps.db, org.id, project.id);
      created = true;
    } else {
      cp.updateUserGoogle(user.id, {
        googleId: profile.googleId ?? user.googleId,
        avatarUrl: profile.picture ?? user.avatarUrl,
        authProvider: "google",
        name: user.name || profile.name,
      });
      user = cp.getUser(user.id)!;
    }

    if (brain) {
      cp.connectProvider({
        userId: user.id,
        organizationId: user.organizationId,
        provider: brain,
        googleEmail: email,
        googleId: profile.googleId ?? null,
      });
    }

    return {
      token: issueToken(user.id),
      user: publicUser(user),
      created,
      providers: cp.listProviders(user.id),
    };
  });

  app.get("/api/v1/auth/me", async (req) => {
    const user = requireAuth(req);
    return { ...publicUser(user), providers: cp.listProviders(user.id) };
  });

  // -- brains (ChatGPT / Gemini / Grok) ------------------------------------

  app.get("/api/v1/providers", async (req) => {
    const user = requireAuth(req);
    return cp.listProviders(user.id);
  });

  app.post("/api/v1/providers", async (req, reply) => {
    const user = requireAuth(req);
    const body = req.body as { provider?: string };
    if (!isBrainId(body?.provider)) {
      return reply.code(400).send({ error: "provider must be chatgpt, gemini, or grok" });
    }
    const connected = cp.connectProvider({
      userId: user.id,
      organizationId: user.organizationId,
      provider: body.provider,
      googleEmail: user.email,
      googleId: user.googleId,
    });
    return reply.code(201).send(connected);
  });

  app.delete("/api/v1/providers/:provider", async (req, reply) => {
    const user = requireAuth(req);
    const { provider } = req.params as { provider: string };
    if (!isBrainId(provider)) return reply.code(400).send({ error: "unknown provider" });
    const ok = cp.disconnectProvider(user.id, provider);
    if (!ok) return reply.code(404).send({ error: "not connected" });
    return { ok: true };
  });

  // -- outline (agents as a triggerable outline) ---------------------------

  app.get("/api/v1/outline", async (req) => {
    const user = requireAuth(req);
    const agents = cp.listAgents(user.organizationId);
    const tools = cp.listTools(user.organizationId);
    const toolMap = new Map(tools.map((t) => [t.id, t]));
    const runs = repo.listRuns(user.organizationId, 80);
    const approvals = repo.listApprovals(user.organizationId).filter((a) => a.status === "PENDING");

    return agents.map((agent) => {
      const version = agent.currentVersionId ? cp.getVersion(agent.currentVersionId) : undefined;
      const steps = (version?.toolIds ?? []).map((id, i) => {
        const t = toolMap.get(id);
        const raw = t?.name ?? id;
        return {
          n: i + 1,
          title: prettyToolName(raw),
          tool: raw,
          detail: t?.description ?? "",
          risk: t?.risk ?? "READ",
        };
      });
      const last = runs.find((r) => r.agentId === agent.id);
      return {
        id: agent.id,
        name: agent.name,
        slug: agent.slug,
        description: agent.description,
        status: agent.status,
        steps,
        lastRun: last
          ? {
              id: last.id,
              status: last.status,
              createdAt: last.createdAt,
              brain: typeof last.input?.brain === "string" ? last.input.brain : null,
            }
          : null,
        pendingApprovals: approvals
          .filter((a) => a.agentId === agent.id)
          .map((a) => ({
            id: a.id,
            action: a.action,
            riskLevel: a.riskLevel,
            payload: a.payload,
            createdAt: a.createdAt,
          })),
      };
    });
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
    const body = req.body as { input?: Record<string, unknown>; triggerType?: any; brain?: string };
    const brain = isBrainId(body.brain) ? body.brain : undefined;
    if (brain) {
      const connected = cp.listProviders(user.id).some((p) => p.provider === brain && p.status === "connected");
      if (!connected) {
        return reply.code(400).send({ error: `Connect ${brain} with Google before triggering` });
      }
    }
    const run = await runtime.startRun({
      organizationId: user.organizationId,
      agentId: agent.id,
      runInput: { ...(body.input ?? {}), ...(brain ? { brain } : {}) },
    }, { triggerType: body.triggerType ?? "manual" });
    return reply.code(201).send(run);
  });

  app.get("/api/v1/runs", async (req) => {
    const user = requireAuth(req);
    const runs = repo.listRuns(user.organizationId, 200);
    return runs.map((r) => ({
      ...r,
      agentName: cp.getAgent(r.agentId)?.name ?? r.agentId,
      brain: typeof r.input?.brain === "string" ? r.input.brain : null,
    }));
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

  // -- diagnostics ---------------------------------------------------------

  /**
   * Answers "the console is empty — why?" without shell access to the server.
   *
   * Reports what this deployment can see: which environment variables are
   * present (values are never returned for secrets), which LLM providers the
   * gateway registered, where the database file lives, and how many rows the
   * caller's organization actually has. An empty console is either "your
   * organization has no rows" or "the console cannot reach this API", and this
   * endpoint distinguishes them in one request.
   */
  app.get("/api/v1/diagnostics", async (req) => {
    const user = requireAuth(req);
    const count = (sql: string, param: string): number =>
      (deps.db.prepare<{ n: number }>(sql).get(param)?.n ?? 0) as number;

    return {
      user: { id: user.id, email: user.email, role: user.role },
      organizationId: user.organizationId,
      counts: {
        agents: count(`SELECT COUNT(*) AS n FROM agents WHERE organization_id = ?`, user.organizationId),
        tools: count(`SELECT COUNT(*) AS n FROM tools WHERE organization_id = ?`, user.organizationId),
        projects: count(`SELECT COUNT(*) AS n FROM projects WHERE organization_id = ?`, user.organizationId),
        users: count(`SELECT COUNT(*) AS n FROM users WHERE organization_id = ?`, user.organizationId),
        runs: count(`SELECT COUNT(*) AS n FROM runs WHERE organization_id = ?`, user.organizationId),
      },
      environment: deps.environment,
      databasePath: deps.databasePath ?? "unknown",
      llmProviders: deps.providers ?? [],
      env: environmentReport(),
    };
  });

  /**
   * Backfills the starter portfolio (two agents, eight tools, one eval
   * dataset) into the caller's organization.
   *
   * Normally this happens at registration and is repaired at API boot, but an
   * organization created by an older build — or one whose seeding failed —
   * needs a way to recover without a database reset. Guarded so it can only
   * run on an organization that has no agents yet.
   */
  app.post("/api/v1/organization/seed", async (req, reply) => {
    const user = requireAuth(req);
    if (!hasPermission(user.id, "agent:create")) return reply.code(403).send({ error: "forbidden" });

    if (cp.listAgents(user.organizationId).length > 0) {
      return reply.code(409).send({ error: "organization already has agents — nothing to seed" });
    }

    const project =
      cp.listProjects(user.organizationId)[0] ??
      cp.createProject({ organizationId: user.organizationId, name: "Engineering", environment: "production" });

    seedOrganization(cp, deps.db, user.organizationId, project.id);

    return {
      ok: true,
      agents: cp.listAgents(user.organizationId).length,
      tools: cp.listTools(user.organizationId).length,
    };
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

/**
 * Environment variables this deployment reads. Reported as `set`/`missing`
 * (plus a length for secrets) so a misconfigured service can be diagnosed
 * from the browser without exposing any value.
 */
const DIAGNOSTIC_ENV_KEYS = [
  "PORT",
  "HOST",
  "ENVIRONMENT",
  "DATABASE_PATH",
  "SESSION_SECRET",
  "HUGGINGFACE_API_KEY",
  "HF_TOKEN",
  "HUGGINGFACE_HUB_API_TOKEN",
  "OPENAI_API_KEY",
  "OPENAI_BASE_URL",
  "GEMINI_API_KEY",
  "GOOGLE_AI_API_KEY",
  "GROK_API_KEY",
  "XAI_API_KEY",
  "GOOGLE_CLIENT_ID",
];

const SECRET_ENV_PATTERN = /(SECRET|TOKEN|KEY|PASSWORD)$/i;

function environmentReport(): Record<string, string> {
  const report: Record<string, string> = {};
  for (const key of DIAGNOSTIC_ENV_KEYS) {
    const value = process.env[key];
    if (value === undefined || value === "") {
      report[key] = "missing";
    } else if (SECRET_ENV_PATTERN.test(key)) {
      report[key] = `set (${value.length} chars)`;
    } else {
      report[key] = value;
    }
  }
  return report;
}

function publicUser(u: {
  id: string;
  organizationId: string;
  email: string;
  name: string;
  role: string;
  createdAt: string;
  avatarUrl?: string | null;
  authProvider?: string;
}) {
  return {
    id: u.id,
    organizationId: u.organizationId,
    email: u.email,
    name: u.name,
    role: u.role,
    createdAt: u.createdAt,
    avatarUrl: u.avatarUrl ?? null,
    authProvider: u.authProvider ?? "password",
  };
}

function withCurrentVersion(a: { currentVersionId: string | null }) {
  return a;
}

function prettyToolName(name: string): string {
  const last = name.split(".").pop() ?? name;
  return last.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function demoGoogleProfile(body: {
  email?: string;
  name?: string;
  picture?: string;
  googleId?: string;
}): { email: string; name: string; picture?: string; googleId?: string } {
  if (process.env.GOOGLE_CLIENT_ID) {
    throw new Error("Google ID token required");
  }
  if (!body?.email || !body.email.includes("@")) {
    throw new Error("email is required");
  }
  return {
    email: body.email,
    name: body.name?.trim() || body.email.split("@")[0]!,
    picture: body.picture,
    googleId: body.googleId,
  };
}

async function verifyGoogleIdToken(idToken: string): Promise<{
  email: string;
  name: string;
  picture?: string;
  googleId?: string;
}> {
  const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`);
  if (!res.ok) throw new Error("invalid Google ID token");
  const data = (await res.json()) as {
    aud?: string;
    email?: string;
    email_verified?: string | boolean;
    name?: string;
    picture?: string;
    sub?: string;
  };
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (clientId && data.aud !== clientId) throw new Error("Google token audience mismatch");
  if (data.email_verified !== "true" && data.email_verified !== true) {
    throw new Error("Google email is not verified");
  }
  if (!data.email) throw new Error("Google token is missing an email");
  return {
    email: data.email,
    name: data.name?.trim() || data.email.split("@")[0]!,
    picture: data.picture,
    googleId: data.sub,
  };
}
