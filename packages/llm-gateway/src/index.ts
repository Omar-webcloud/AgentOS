import type { ModelConfig } from "@agentos/core";

/**
 * LLM gateway (PRD §16–§17). Agents reference a logical `model` (e.g. "mock",
 * "openai:gpt-4o-mini"); this layer resolves it to a provider. Model routing
 * (cost/latency/capability) can be layered on top without touching agents.
 */

export interface LLMMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  /** For tool results: the tool name this message responds to. */
  toolName?: string;
}

export interface ToolSpec {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export interface LLMUsage {
  promptTokens: number;
  completionTokens: number;
  costUsd: number;
}

export interface LLMResponse {
  content: string;
  toolCalls: { name: string; arguments: Record<string, unknown> }[];
  usage: LLMUsage;
  provider: string;
}

export interface LLMRequest {
  messages: LLMMessage[];
  tools: ToolSpec[];
  config: ModelConfig;
}

export interface LLMProvider {
  readonly name: string;
  complete(req: LLMRequest): Promise<LLMResponse>;
}

/**
 * Deterministic mock provider. It powers the portfolio demo without any API
 * key, and behaves like a *reactive* agent:
 *
 *   1. If the system message contains a `MOCK_SCRIPT` directive, follow it.
 *   2. Otherwise call each available tool once (in order), filling required
 *      arguments with sensible values derived from the task.
 *   3. When tools are exhausted (or budget spent), emit a final answer.
 *
 * It is intentionally deterministic so runs, evals, and traces reproduce.
 */
export class MockProvider implements LLMProvider {
  readonly name = "mock";

  async complete(req: LLMRequest): Promise<LLMResponse> {
    const system = req.messages.find((m) => m.role === "system")?.content ?? "";
    const user = req.messages.find((m) => m.role === "user")?.content ?? "";

    const script = parseScript(system);
    const toolResults = req.messages.filter((m) => m.role === "tool").length;
    // The script advances one step per completed tool result.
    const toolCallsMade = toolResults;

    // Follow an explicit script when present (demo/eval determinism).
    if (script.length > 0) {
      const next = script[toolCallsMade];
      if (next && next.kind === "tool") {
        const tool = req.tools.find((t) => t.name === next.tool);
        if (tool) {
          return {
            content: "",
            toolCalls: [{ name: next.tool, arguments: fillArgs(tool, next.args ?? {}) }],
            usage: { promptTokens: estimateTokens(system + user), completionTokens: 40, costUsd: 0.0004 },
            provider: this.name,
          };
        }
      }
      return this.finalAnswer(system, user, req);
    }

    // Reactive fallback: call each tool once, then finalize.
    const uncalled = req.tools.filter(
      (t) => !req.messages.some((m) => m.role === "assistant" && m.toolName === t.name),
    );
    if (uncalled.length > 0 && toolCallsMade < 6) {
      const tool = uncalled[0]!;
      const input = JSON.parse(user || "{}") as Record<string, unknown>;
      return {
        content: "",
        toolCalls: [{ name: tool.name, arguments: fillArgs(tool, input) }],
        usage: { promptTokens: estimateTokens(system + user), completionTokens: 40, costUsd: 0.0004 },
        provider: this.name,
      };
    }

    return this.finalAnswer(system, user, req);
  }

  private finalAnswer(
    system: string,
    user: string,
    req: LLMRequest,
  ): LLMResponse {
    const toolResults = req.messages
      .filter((m) => m.role === "tool")
      .map((m) => m.content);
    const body =
      toolResults.length > 0
        ? `Analysis complete using ${toolResults.length} tool result(s).\n\n${toolResults
            .slice(0, 3)
            .map((r, i) => `[${i + 1}] ${truncate(r, 200)}`)
            .join("\n\n")}\n\nConclusion: task evaluated deterministically by the mock agent.`
        : `Task acknowledged: ${truncate(user, 200)}`;
    return {
      content: body,
      toolCalls: [],
      usage: { promptTokens: estimateTokens(system + user), completionTokens: estimateTokens(body), costUsd: 0.0002 },
      provider: this.name,
    };
  }
}

/**
 * OpenAI-compatible provider. Used when `OPENAI_API_KEY` is set and an agent
 * references `openai:...`. Falls back to the mock provider on failure.
 */
export class OpenAIProvider implements LLMProvider {
  readonly name = "openai";
  constructor(private apiKey: string, private baseUrl = "https://api.openai.com/v1") {}

  async complete(req: LLMRequest): Promise<LLMResponse> {
    const model = req.config.model.replace(/^openai:/, "");
    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: req.config.temperature,
        max_tokens: req.config.maxTokens,
        messages: req.messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
        tools: req.tools.map((t) => ({
          type: "function",
          function: { name: t.name, description: t.description, parameters: t.inputSchema },
        })),
      }),
    });
    if (!res.ok) {
      throw new Error(`OpenAI error ${res.status}: ${await res.text()}`);
    }
    const data = (await res.json()) as any;
    const message = data.choices?.[0]?.message ?? {};
    const toolCalls = (message.tool_calls ?? []).map((tc: any) => ({
      name: tc.function.name,
      arguments: JSON.parse(tc.function.arguments ?? "{}"),
    }));
    const promptTokens = data.usage?.prompt_tokens ?? 0;
    const completionTokens = data.usage?.completion_tokens ?? 0;
    return {
      content: message.content ?? "",
      toolCalls,
      usage: {
        promptTokens,
        completionTokens,
        costUsd: promptTokens * 3e-6 + completionTokens * 15e-6,
      },
      provider: this.name,
    };
  }
}

export function createGateway(config: { openaiApiKey?: string } = {}): {
  providers: LLMProvider[];
  complete(req: LLMRequest): Promise<LLMResponse>;
} {
  const mock = new MockProvider();
  const providers: LLMProvider[] = [mock];
  if (config.openaiApiKey) {
    providers.push(new OpenAIProvider(config.openaiApiKey));
  }
  return {
    providers,
    async complete(req) {
      const want = req.config.provider;
      const ordered = [...providers].sort((a, b) =>
        a.name === want ? -1 : b.name === want ? 1 : 0,
      );
      // Model fallback: try primary, then next provider (PRD §17).
      let lastErr: unknown;
      for (const p of ordered) {
        try {
          return await p.complete(req);
        } catch (err) {
          lastErr = err;
        }
      }
      throw lastErr ?? new Error("no LLM provider available");
    },
  };
}

// --- helpers ---

interface ScriptStep {
  kind: "tool";
  tool: string;
  args?: Record<string, unknown>;
}

function parseScript(system: string): ScriptStep[] {
  const marker = "MOCK_SCRIPT:";
  const idx = system.indexOf(marker);
  if (idx === -1) return [];
  const remainder = system.slice(idx + marker.length);
  const json = extractBalancedArray(remainder);
  if (!json) return [];
  try {
    const parsed = JSON.parse(json);
    if (Array.isArray(parsed)) return parsed as ScriptStep[];
  } catch {
    return [];
  }
  return [];
}

/** Extract the first balanced `[...]` JSON array from text with trailing content. */
function extractBalancedArray(text: string): string | null {
  const start = text.indexOf("[");
  if (start === -1) return null;
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i]!;
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === "[") depth++;
    else if (ch === "]") {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return null;
}

function fillArgs(
  tool: ToolSpec,
  seed: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...seed };
  const schema = tool.inputSchema as {
    properties?: Record<string, unknown>;
    required?: string[];
  };
  for (const [key, value] of Object.entries(schema.properties ?? {})) {
    if (out[key] !== undefined) continue;
    const spec = value as { type?: string; default?: unknown; enum?: unknown[] };
    if (spec.default !== undefined) out[key] = spec.default;
    else if (spec.enum && spec.enum.length > 0) out[key] = spec.enum[0];
    else if (spec.type === "string") out[key] = "acme/demo";
    else if (spec.type === "number" || spec.type === "integer") out[key] = 123;
    else if (spec.type === "boolean") out[key] = false;
  }
  return out;
}

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

function truncate(text: string, max: number): string {
  return text.length > max ? text.slice(0, max) + "…" : text;
}
