import type {
  Agent,
  AgentVersion,
  Approval,
  EnvironmentName,
  ID,
  Run,
  ToolDefinition,
} from "@agentos/core";
import { makeId } from "@agentos/core";
import { evaluatePolicy } from "@agentos/policy-engine";
import type { LLMMessage, LLMResponse, ToolSpec } from "@agentos/llm-gateway";
import { ToolRuntime } from "@agentos/tool-runtime";
import { RuntimeRepository } from "./repository.js";

/**
 * The Agent Runtime — the heart of AgentOS (PRD §28–§35).
 *
 * It implements the reactive agent loop, the execution state machine, durable
 * execution via checkpoints, tool authorization through the policy engine,
 * human-in-the-loop approvals, budget enforcement, and per-step tracing.
 *
 * Design invariants:
 *   - The model only ever *proposes* a tool call; the runtime authorizes it.
 *   - Approval-required tool calls pause the run; `resolveApproval` resumes it.
 *   - Every state transition and step is persisted (durable execution).
 */

export interface RuntimeDeps {
  repo: RuntimeRepository;
  gateway: { complete(req: { messages: LLMMessage[]; tools: ToolSpec[]; config: { model: string; provider: string; temperature: number; maxTokens: number } }): Promise<LLMResponse> };
  tools: ToolRuntime;
  /** Resolve tool IDs to definitions (control-plane lookup). */
  getTool(id: ID): ToolDefinition | undefined;
  getAgent(id: ID): Agent | undefined;
  getVersion(id: ID): AgentVersion | undefined;
  environment: EnvironmentName;
}

export interface RunOptions {
  triggerType?: Run["triggerType"];
  /** Continue from a saved checkpoint instead of starting fresh. */
  resume?: boolean;
}

interface CheckpointState {
  stepIndex: number;
  iteration: number;
  messages: LLMMessage[];
  costUsd: number;
  tokenUsage: number;
  toolsCalled: Set<string>;
}

interface BudgetSnapshot {
  costUsd: number;
  tokenUsage: number;
}

export class AgentRuntime {
  constructor(private deps: RuntimeDeps) {}

  /** Create a run and execute it to completion (or until it needs approval). */
  async startRun(
    input: {
      organizationId: ID;
      agentId: ID;
      agentVersionId?: ID;
      runInput: Record<string, unknown>;
    },
    options: RunOptions = {},
  ): Promise<Run> {
    const agent = this.deps.getAgent(input.agentId);
    if (!agent) throw new Error(`agent ${input.agentId} not found`);

    const versionId = input.agentVersionId ?? agent.currentVersionId;
    if (!versionId) throw new Error(`agent ${agent.name} has no published version`);
    const version = this.deps.getVersion(versionId);
    if (!version) throw new Error(`agent version ${versionId} not found`);

    const run = this.deps.repo.createRun({
      organizationId: input.organizationId,
      agentId: agent.id,
      agentVersionId: versionId,
      triggerType: options.triggerType ?? "manual",
      runInput: input.runInput,
    });

    return this.execute(run, version, options);
  }

  /** Resume a paused (approval-waiting) run after an approval decision. */
  async resolveApproval(approvalId: ID, decision: "APPROVED" | "REJECTED", actorId: ID): Promise<Run> {
    const approval = this.deps.repo.getApproval(approvalId);
    if (!approval) throw new Error(`approval ${approvalId} not found`);
    if (approval.status !== "PENDING") throw new Error(`approval ${approvalId} is already ${approval.status}`);

    this.deps.repo.updateApproval(approvalId, {
      status: decision,
      resolvedAt: new Date().toISOString(),
      resolvedBy: actorId,
    });

    const run = this.deps.repo.getRun(approval.runId);
    if (!run) throw new Error(`run ${approval.runId} not found`);
    const version = this.deps.getVersion(run.agentVersionId);
    if (!version) throw new Error(`version ${run.agentVersionId} not found`);

    this.deps.repo.recordAudit({
      organizationId: run.organizationId,
      actor: actorId,
      resource: "approval",
      action: decision === "APPROVED" ? "approval.approve" : "approval.reject",
      result: "success",
      metadata: { approvalId, runId: run.id, action: approval.action },
    });

    if (decision === "REJECTED") {
      // Fail closed: rejection stops the run with a clear error.
      this.deps.repo.updateRun(run.id, {
        status: "FAILED",
        error: `approval rejected for action "${approval.action}"`,
        completedAt: new Date().toISOString(),
      });
      return this.deps.repo.getRun(run.id)!;
    }

    // APPROVED: execute the now-authorized tool, append its result to the
    // durable transcript, then resume the loop (PRD §35–§38).
    const tool = buildToolSpecs(version, this.deps.getTool).find((t) => t.name === approval.action)?.__tool;
    if (!tool) {
      this.deps.repo.updateRun(run.id, {
        status: "FAILED",
        error: `approved tool "${approval.action}" no longer attached to agent`,
        completedAt: new Date().toISOString(),
      });
      return this.deps.repo.getRun(run.id)!;
    }

    const state = (this.deps.repo.loadCheckpoint(run.id) as CheckpointState | undefined) ?? {
      stepIndex: 0,
      iteration: 0,
      messages: [],
      costUsd: run.estimatedCostUsd,
      tokenUsage: run.tokenUsage,
      toolsCalled: new Set(),
    };

    const toolResult = await this.deps.tools.execute(tool, {
      args: approval.payload,
      operationId: `${run.id}_${approval.stepId ?? "approval"}`,
    });

    if (approval.stepId) {
      this.deps.repo.updateStep(approval.stepId, {
        status: toolResult.ok ? "SUCCEEDED" : "FAILED",
        output: toolResult.data,
        error: toolResult.error ?? null,
        completedAt: new Date().toISOString(),
        durationMs: toolResult.durationMs,
      });
    }

    state.messages.push({
      role: "tool",
      content: JSON.stringify(toolResult.ok ? toolResult.data : { error: toolResult.error }),
      toolName: tool.name,
    });
    this.deps.repo.saveCheckpoint(run.id, {
      ...state,
      toolsCalled: [...state.toolsCalled],
    });

    if (!toolResult.ok) {
      this.deps.repo.updateRun(run.id, {
        status: "FAILED",
        error: `approved tool "${tool.name}" failed: ${toolResult.error}`,
        completedAt: new Date().toISOString(),
      });
      return this.deps.repo.getRun(run.id)!;
    }

    return this.execute(run, version, { resume: true });
  }

  // -------------------------------------------------------------------------

  private async execute(run: Run, version: AgentVersion, options: RunOptions): Promise<Run> {
    const startTime = Date.now();
    this.deps.repo.updateRun(run.id, {
      status: "RUNNING",
      startedAt: run.startedAt ?? new Date().toISOString(),
    });

    const rootSpan = this.deps.repo.createSpan({
      runId: run.id,
      name: "agent.invoke",
      kind: "AGENT",
      parentId: null,
      startedAt: new Date().toISOString(),
      durationMs: 0,
      attributes: { agentId: run.agentId, version: version.version },
    });

    // Load or initialize durable state.
    const state: CheckpointState =
      (options.resume ? (this.deps.repo.loadCheckpoint(run.id) as CheckpointState | undefined) : undefined) ??
      {
        stepIndex: 0,
        iteration: 0,
        messages: [],
        costUsd: run.estimatedCostUsd,
        tokenUsage: run.tokenUsage,
        toolsCalled: new Set(),
      };

    const budget: BudgetSnapshot = { costUsd: state.costUsd, tokenUsage: state.tokenUsage };

    // Build the system prompt once from the agent version.
    const system = buildSystemPrompt(version, run);
    const toolSpecs = buildToolSpecs(version, this.deps.getTool);

    try {
      let finished = false;

      while (!finished) {
        this.checkBudget(budget, version, run);

        const messages: LLMMessage[] = [
          { role: "system", content: system },
          { role: "user", content: JSON.stringify(run.input) },
          ...state.messages,
        ];

        const response = await this.deps.gateway.complete({
          messages,
          tools: toolSpecs,
          config: version.modelConfig,
        });

        budget.tokenUsage += response.usage.promptTokens + response.usage.completionTokens;
        budget.costUsd += response.usage.costUsd;

        this.deps.repo.createSpan({
          runId: run.id,
          name: "gen_ai.llm",
          kind: "LLM",
          parentId: rootSpan.id,
          startedAt: new Date().toISOString(),
          durationMs: 0,
          attributes: {
            provider: response.provider,
            model: version.modelConfig.model,
            promptTokens: response.usage.promptTokens,
            completionTokens: response.usage.completionTokens,
            costUsd: response.usage.costUsd,
          },
        });

        const llmStep = this.deps.repo.createStep({
          runId: run.id,
          sequence: ++state.stepIndex,
          type: "llm",
          stepInput: { toolCalls: response.toolCalls.map((t) => t.name) },
        });
        this.deps.repo.updateStep(llmStep.id, {
          status: "SUCCEEDED",
          output: response.toolCalls.length > 0 ? response.toolCalls : { content: response.content },
          startedAt: new Date().toISOString(),
          completedAt: new Date().toISOString(),
          costUsd: response.usage.costUsd,
        });

        // Persist progress (durable execution / checkpoint).
        state.messages.push({ role: "assistant", content: response.content || "(tool call)" });
        this.checkpoint(run, state, budget);

        if (response.toolCalls.length === 0) {
          // Final answer.
          finished = true;
          const finalStep = this.deps.repo.createStep({
            runId: run.id,
            sequence: ++state.stepIndex,
            type: "final",
            stepInput: null,
          });
          this.deps.repo.updateStep(finalStep.id, {
            status: "SUCCEEDED",
            output: response.content,
            startedAt: new Date().toISOString(),
            completedAt: new Date().toISOString(),
          });
          this.finish(run, response.content, budget, startTime, version);
          break;
        }

        // Process tool calls (authorize → maybe approve → execute).
        for (const call of response.toolCalls) {
          const tool = toolSpecs.find((t) => t.name === call.name)?.__tool;
          if (!tool) {
            this.fail(run, `tool "${call.name}" not found or not attached to agent`, budget, startTime, version);
            return this.deps.repo.getRun(run.id)!;
          }

          const step = this.deps.repo.createStep({
            runId: run.id,
            sequence: ++state.stepIndex,
            type: "tool",
            toolId: tool.id,
            stepInput: call.arguments,
          });
          this.deps.repo.updateStep(step.id, { startedAt: new Date().toISOString(), status: "RUNNING" });

          // Authorize via policy engine (never agent → tool directly).
          const decision = evaluatePolicy(
            {
              toolName: tool.name,
              risk: tool.risk,
              environment: this.deps.environment,
              args: call.arguments,
            },
            version.policyConfig,
          );

          this.deps.repo.recordAudit({
            organizationId: run.organizationId,
            actor: null,
            resource: "tool",
            action: tool.name,
            result: decision.action === "allow" ? "allow" : decision.action === "deny" ? "deny" : "approval",
            metadata: { runId: run.id, stepId: step.id, args: call.arguments, reason: decision.reason },
          });

          if (decision.action === "deny") {
            this.deps.repo.updateStep(step.id, {
              status: "FAILED",
              error: decision.reason,
              completedAt: new Date().toISOString(),
            });
            this.fail(run, decision.reason, budget, startTime, version);
            return this.deps.repo.getRun(run.id)!;
          }

          if (decision.action === "require_approval") {
            // Pause for human approval.
            const approval = this.deps.repo.createApproval({
              runId: run.id,
              stepId: step.id,
              agentId: run.agentId,
              action: tool.name,
              riskLevel: tool.risk,
              payload: call.arguments,
              ttlMs: 15 * 60 * 1000, // PRD §38: default 15 minutes
            });
            this.deps.repo.createSpan({
              runId: run.id,
              name: "approval.requested",
              kind: "APPROVAL",
              parentId: rootSpan.id,
              startedAt: new Date().toISOString(),
              durationMs: 0,
              attributes: { approvalId: approval.id, tool: tool.name, risk: tool.risk },
            });
            this.deps.repo.updateRun(run.id, { status: "WAITING_APPROVAL" });
            this.checkpoint(run, state, budget);
            return this.deps.repo.getRun(run.id)!;
          }

          // Execute the tool.
          const toolResult = await this.deps.tools.execute(tool, {
            args: call.arguments,
            operationId: `${run.id}_${state.stepIndex}`,
          });

          this.deps.repo.updateStep(step.id, {
            status: toolResult.ok ? "SUCCEEDED" : "FAILED",
            output: toolResult.data,
            error: toolResult.error ?? null,
            completedAt: new Date().toISOString(),
            durationMs: toolResult.durationMs,
          });

          this.deps.repo.createSpan({
            runId: run.id,
            name: `tool.${tool.name}`,
            kind: "TOOL",
            parentId: rootSpan.id,
            startedAt: new Date().toISOString(),
            durationMs: toolResult.durationMs,
            attributes: {
              tool: tool.name,
              risk: tool.risk,
              ok: toolResult.ok,
              attempts: toolResult.attempts,
              dryRun: toolResult.dryRun,
            },
          });

          state.messages.push({
            role: "tool",
            content: JSON.stringify(toolResult.ok ? toolResult.data : { error: toolResult.error }),
            toolName: tool.name,
          });

          if (!toolResult.ok) {
            this.fail(run, `tool "${tool.name}" failed: ${toolResult.error}`, budget, startTime, version);
            return this.deps.repo.getRun(run.id)!;
          }

          this.checkpoint(run, state, budget);
        }

        state.iteration++;
        if (state.iteration >= version.runtimeConfig.maxIterations) {
          this.fail(run, `exceeded maximum iterations (${version.runtimeConfig.maxIterations})`, budget, startTime, version);
          return this.deps.repo.getRun(run.id)!;
        }
      }

      // Close root span.
      const completed = this.deps.repo.getRun(run.id)!;
      const span = this.deps.repo.listTraces(run.id).find((s) => s.id === rootSpan.id);
      // (root span duration is best-effort; not persisted retroactively in MVP)
      void span;

      this.deps.repo.updateRun(run.id, {
        tokenUsage: budget.tokenUsage,
        estimatedCostUsd: budget.costUsd,
      });
      return this.deps.repo.getRun(run.id)!;
    } catch (err) {
      const msg = (err as Error)?.message ?? "unknown runtime error";
      this.fail(run, msg, budget, startTime, version);
      return this.deps.repo.getRun(run.id)!;
    }
  }

  private checkpoint(run: Run, state: CheckpointState, budget: BudgetSnapshot): void {
    this.deps.repo.saveCheckpoint(run.id, {
      ...state,
      costUsd: budget.costUsd,
      tokenUsage: budget.tokenUsage,
      toolsCalled: [...state.toolsCalled],
    });
    this.deps.repo.updateRun(run.id, {
      estimatedCostUsd: budget.costUsd,
      tokenUsage: budget.tokenUsage,
    });
  }

  private checkBudget(budget: BudgetSnapshot, version: AgentVersion, run: Run): void {
    const rc = version.runtimeConfig;
    if (budget.costUsd > rc.maxCostUsd) {
      throw new Error(`cost budget exceeded ($${budget.costUsd.toFixed(2)} > $${rc.maxCostUsd.toFixed(2)})`);
    }
    if (budget.tokenUsage > rc.tokenBudget) {
      throw new Error(`token budget exceeded (${budget.tokenUsage} > ${rc.tokenBudget})`);
    }
  }

  private finish(
    run: Run,
    output: string,
    budget: BudgetSnapshot,
    startTime: number,
    _version: AgentVersion,
  ): void {
    this.deps.repo.clearCheckpoint(run.id);
    this.deps.repo.updateRun(run.id, {
      status: "COMPLETED",
      output,
      completedAt: new Date().toISOString(),
      durationMs: Date.now() - startTime,
      estimatedCostUsd: budget.costUsd,
      tokenUsage: budget.tokenUsage,
    });
  }

  private fail(
    run: Run,
    error: string,
    budget: BudgetSnapshot,
    startTime: number,
    _version: AgentVersion,
  ): void {
    this.deps.repo.updateRun(run.id, {
      status: "FAILED",
      error,
      completedAt: new Date().toISOString(),
      durationMs: Date.now() - startTime,
      estimatedCostUsd: budget.costUsd,
      tokenUsage: budget.tokenUsage,
    });
  }
}

// ---------------------------------------------------------------------------

function buildSystemPrompt(version: AgentVersion, run: Run): string {
  return [
    version.instructions,
    "",
    "You are an autonomous agent. Decide between calling a tool and producing a final answer.",
    "Return a tool call only when an attached tool is needed. Otherwise return the final answer.",
    `Run ID: ${run.id}`,
  ].join("\n");
}

function buildToolSpecs(
  version: AgentVersion,
  getTool: (id: ID) => ToolDefinition | undefined,
): (ToolSpec & { __tool: ToolDefinition })[] {
  const specs: (ToolSpec & { __tool: ToolDefinition })[] = [];
  for (const id of version.toolIds) {
    const tool = getTool(id);
    if (!tool) continue;
    specs.push({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema,
      __tool: tool,
    });
  }
  return specs;
}
