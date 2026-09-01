import type { Db } from "@agentos/db";
import type {
  Agent,
  AgentVersion,
  EnvironmentName,
  ID,
  ModelConfig,
  Organization,
  Project,
  RuntimeConfig,
  ToolDefinition,
  User,
} from "@agentos/core";
import { makeId, nowIso, slugify } from "@agentos/core";

/**
 * Control-plane repository (PRD §4): organizations, users, projects, agents,
 * agent versions, and tools. Separated from the runtime's data-plane
 * repository to preserve the control/data plane boundary.
 */

const json = (v: unknown) => JSON.stringify(v ?? null);
const parse = <T>(s: unknown, fallback: T): T =>
  s == null ? fallback : (JSON.parse(s as string) as T);

export class ControlPlane {
  constructor(private db: Db) {}

  // -- organizations -------------------------------------------------------

  createOrganization(name: string): Organization {
    const org: Organization = {
      id: makeId("org"),
      name,
      slug: `${slugify(name) || "org"}-${makeId("").replace("_", "").slice(0, 6)}`,
      createdAt: nowIso(),
    };
    this.db
      .prepare(`INSERT INTO organizations (id, name, slug, created_at) VALUES (?, ?, ?, ?)`)
      .run(org.id, org.name, org.slug, org.createdAt);
    return org;
  }

  getOrganization(id: ID): Organization | undefined {
    const r = this.db.prepare<Record<string, unknown>>(`SELECT * FROM organizations WHERE id = ?`).get(id);
    return r ? { id: r.id as ID, name: r.name as string, slug: r.slug as string, createdAt: r.created_at as string } : undefined;
  }

  // -- users ---------------------------------------------------------------

  createUser(input: { organizationId: ID; email: string; name: string; role: User["role"]; passwordHash: string | null }): User {
    const user: User = {
      id: makeId("user"),
      organizationId: input.organizationId,
      email: input.email.toLowerCase(),
      name: input.name,
      role: input.role,
      passwordHash: input.passwordHash,
      createdAt: nowIso(),
    };
    this.db
      .prepare(`INSERT INTO users (id, organization_id, email, name, role, password_hash, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`)
      .run(user.id, user.organizationId, user.email, user.name, user.role, user.passwordHash, user.createdAt);
    return user;
  }

  getUser(id: ID): User | undefined {
    return this.getUserBy("id", id);
  }

  getUserByEmail(email: string): User | undefined {
    return this.getUserBy("email", email.toLowerCase());
  }

  listUsers(organizationId: ID): User[] {
    const rows = this.db.prepare<Record<string, unknown>>(`SELECT * FROM users WHERE organization_id = ? ORDER BY created_at ASC`).all(organizationId);
    return rows.map(mapUser);
  }

  private getUserBy(col: "id" | "email", value: string): User | undefined {
    const r = this.db.prepare<Record<string, unknown>>(`SELECT * FROM users WHERE ${col} = ?`).get(value);
    return r ? mapUser(r) : undefined;
  }

  // -- projects ------------------------------------------------------------

  createProject(input: { organizationId: ID; name: string; environment: EnvironmentName }): Project {
    const project: Project = {
      id: makeId("project"),
      organizationId: input.organizationId,
      name: input.name,
      environment: input.environment,
      createdAt: nowIso(),
    };
    this.db
      .prepare(`INSERT INTO projects (id, organization_id, name, environment, created_at) VALUES (?, ?, ?, ?, ?)`)
      .run(project.id, project.organizationId, project.name, project.environment, project.createdAt);
    return project;
  }

  getProject(id: ID): Project | undefined {
    const r = this.db.prepare<Record<string, unknown>>(`SELECT * FROM projects WHERE id = ?`).get(id);
    return r ? { id: r.id as ID, organizationId: r.organization_id as ID, name: r.name as string, environment: r.environment as EnvironmentName, createdAt: r.created_at as string } : undefined;
  }

  listProjects(organizationId: ID): Project[] {
    const rows = this.db.prepare<Record<string, unknown>>(`SELECT * FROM projects WHERE organization_id = ? ORDER BY created_at ASC`).all(organizationId);
    return rows.map((r) => ({ id: r.id as ID, organizationId: r.organization_id as ID, name: r.name as string, environment: r.environment as EnvironmentName, createdAt: r.created_at as string }));
  }

  // -- agents --------------------------------------------------------------

  createAgent(input: { organizationId: ID; projectId: ID; name: string; description?: string; status?: Agent["status"] }): Agent {
    const agent: Agent = {
      id: makeId("agent"),
      organizationId: input.organizationId,
      projectId: input.projectId,
      name: input.name,
      slug: slugify(input.name),
      description: input.description ?? "",
      status: input.status ?? "draft",
      currentVersionId: null,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    this.db
      .prepare(`INSERT INTO agents (id, organization_id, project_id, name, slug, description, status, current_version_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?, ?)`)
      .run(agent.id, agent.organizationId, agent.projectId, agent.name, agent.slug, agent.description, agent.status, agent.createdAt, agent.updatedAt);
    return agent;
  }

  getAgent(id: ID): Agent | undefined {
    const r = this.db.prepare<Record<string, unknown>>(`SELECT * FROM agents WHERE id = ?`).get(id);
    return r ? mapAgent(r) : undefined;
  }

  listAgents(organizationId: ID): Agent[] {
    const rows = this.db.prepare<Record<string, unknown>>(`SELECT * FROM agents WHERE organization_id = ? ORDER BY created_at DESC`).all(organizationId);
    return rows.map(mapAgent);
  }

  updateAgent(id: ID, patch: Partial<Pick<Agent, "name" | "description" | "status" | "currentVersionId">>): Agent | undefined {
    const sets: string[] = [];
    const values: unknown[] = [];
    if (patch.name !== undefined) { sets.push("name = ?, slug = ?"); values.push(patch.name, slugify(patch.name)); }
    if (patch.description !== undefined) { sets.push("description = ?"); values.push(patch.description); }
    if (patch.status !== undefined) { sets.push("status = ?"); values.push(patch.status); }
    if (patch.currentVersionId !== undefined) { sets.push("current_version_id = ?"); values.push(patch.currentVersionId); }
    if (sets.length === 0) return this.getAgent(id);
    sets.push("updated_at = ?");
    values.push(nowIso(), id);
    this.db.prepare(`UPDATE agents SET ${sets.join(", ")} WHERE id = ?`).run(...values);
    return this.getAgent(id);
  }

  deleteAgent(id: ID): void {
    this.db.prepare(`DELETE FROM agent_versions WHERE agent_id = ?`).run(id);
    this.db.prepare(`DELETE FROM agents WHERE id = ?`).run(id);
  }

  // -- agent versions ------------------------------------------------------

  createVersion(input: {
    agentId: ID;
    instructions: string;
    modelConfig: ModelConfig;
    runtimeConfig: RuntimeConfig;
    toolIds: ID[];
    policyConfig: unknown[];
  }): AgentVersion {
    const agent = this.getAgent(input.agentId);
    if (!agent) throw new Error("agent not found");
    const existing = this.db.prepare<{ max: number }>(`SELECT COALESCE(MAX(version), 0) AS max FROM agent_versions WHERE agent_id = ?`).get(input.agentId);
    const version: AgentVersion = {
      id: makeId("ver"),
      agentId: input.agentId,
      version: (existing?.max ?? 0) + 1,
      instructions: input.instructions,
      modelConfig: input.modelConfig,
      runtimeConfig: input.runtimeConfig,
      toolIds: input.toolIds,
      policyConfig: input.policyConfig as AgentVersion["policyConfig"],
      status: "published",
      createdAt: nowIso(),
    };
    this.db
      .prepare(`INSERT INTO agent_versions (id, agent_id, version, instructions, model_config, runtime_config, tool_ids, policy_config, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'published', ?)`)
      .run(version.id, version.agentId, version.version, version.instructions, json(version.modelConfig), json(version.runtimeConfig), json(version.toolIds), json(version.policyConfig), version.createdAt);
    this.updateAgent(agent.id, { currentVersionId: version.id, status: "active" });
    return version;
  }

  getVersion(id: ID): AgentVersion | undefined {
    const r = this.db.prepare<Record<string, unknown>>(`SELECT * FROM agent_versions WHERE id = ?`).get(id);
    return r ? mapVersion(r) : undefined;
  }

  listVersions(agentId: ID): AgentVersion[] {
    const rows = this.db.prepare<Record<string, unknown>>(`SELECT * FROM agent_versions WHERE agent_id = ? ORDER BY version DESC`).all(agentId);
    return rows.map(mapVersion);
  }

  // -- tools ---------------------------------------------------------------

  createTool(input: Omit<ToolDefinition, "id" | "usage_count" | "success_count" | "createdAt">): ToolDefinition {
    const tool: ToolDefinition & { usage_count: number; success_count: number; created_at: string } = {
      ...input,
      id: makeId("tool"),
      usage_count: 0,
      success_count: 0,
      created_at: nowIso(),
    };
    this.db
      .prepare(`INSERT INTO tools (id, organization_id, name, description, input_schema, output_schema, risk, timeout_ms, retry_policy, implementation, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(tool.id, tool.organizationId, tool.name, tool.description, json(tool.inputSchema), json(tool.outputSchema), tool.risk, tool.timeoutMs, json(tool.retryPolicy), json(tool.implementation), tool.created_at);
    return tool;
  }

  getTool(id: ID): ToolDefinition | undefined {
    const r = this.db.prepare<Record<string, unknown>>(`SELECT * FROM tools WHERE id = ?`).get(id);
    return r ? mapTool(r) : undefined;
  }

  listTools(organizationId: ID): ToolDefinition[] {
    const rows = this.db.prepare<Record<string, unknown>>(`SELECT * FROM tools WHERE organization_id = ? ORDER BY name ASC`).all(organizationId);
    return rows.map(mapTool);
  }

  recordToolUsage(id: ID, ok: boolean): void {
    this.db.prepare(`UPDATE tools SET usage_count = usage_count + 1, success_count = success_count + ? WHERE id = ?`).run(ok ? 1 : 0, id);
  }
}

// --- mappers ---------------------------------------------------------------

function mapUser(r: Record<string, unknown>): User {
  return {
    id: r.id as ID,
    organizationId: r.organization_id as ID,
    email: r.email as string,
    name: r.name as string,
    role: r.role as User["role"],
    passwordHash: (r.password_hash as string | null) ?? null,
    createdAt: r.created_at as string,
  };
}

function mapAgent(r: Record<string, unknown>): Agent {
  return {
    id: r.id as ID,
    organizationId: r.organization_id as ID,
    projectId: r.project_id as ID,
    name: r.name as string,
    slug: r.slug as string,
    description: (r.description as string) ?? "",
    status: r.status as Agent["status"],
    currentVersionId: (r.current_version_id as ID | null) ?? null,
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
  };
}

function mapVersion(r: Record<string, unknown>): AgentVersion {
  return {
    id: r.id as ID,
    agentId: r.agent_id as ID,
    version: r.version as number,
    instructions: r.instructions as string,
    modelConfig: parse(r.model_config, { model: "mock", provider: "mock", temperature: 0, maxTokens: 4096 }),
    runtimeConfig: parse(r.runtime_config, defaultRuntimeConfig()),
    toolIds: parse(r.tool_ids, []),
    policyConfig: parse(r.policy_config, []),
    status: r.status as AgentVersion["status"],
    createdAt: r.created_at as string,
  };
}

function mapTool(r: Record<string, unknown>): ToolDefinition {
  return {
    id: r.id as ID,
    organizationId: r.organization_id as ID,
    name: r.name as string,
    description: (r.description as string) ?? "",
    inputSchema: parse(r.input_schema, {}),
    outputSchema: parse(r.output_schema, {}),
    risk: r.risk as ToolDefinition["risk"],
    timeoutMs: (r.timeout_ms as number) ?? 30000,
    retryPolicy: parse(r.retry_policy, { attempts: 1, strategy: "fixed", initialDelayMs: 0, maxDelayMs: 0, retryable: [] }),
    implementation: parse(r.implementation, { kind: "mock", behavior: "echo" }),
  };
}

export function defaultRuntimeConfig(): RuntimeConfig {
  return {
    maxIterations: 10,
    maxExecutionTimeMs: 10 * 60 * 1000,
    maxCostUsd: 1.0,
    tokenBudget: 100_000,
    maxToolCalls: 20,
    maxDelegationDepth: 5,
  };
}
