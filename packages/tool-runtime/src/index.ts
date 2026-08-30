import type { RetryPolicy, ToolDefinition, ToolRisk } from "@agentos/core";

/**
 * Tool runtime (PRD §18–§21, §33–§34). Executes a tool definition with:
 *   - timeout enforcement
 *   - retry with exponential backoff for retryable errors only
 *   - idempotency via `operationId` (deduped by the runtime/checkpoint layer)
 *   - dry-run support (PRD §149): no side effects are performed
 *
 * The mock implementation kinds let the demo show success, failure, latency,
 * and approval-required behaviour without external systems.
 */

export interface ToolResult {
  ok: boolean;
  data: unknown;
  error?: string;
  dryRun: boolean;
  durationMs: number;
  attempts: number;
}

export interface ExecuteOptions {
  args: Record<string, unknown>;
  /** Stable idempotency key (e.g. `run_123_step_8`, PRD §32). */
  operationId?: string;
  dryRun?: boolean;
}

const RETRYABLE = new Set(["TimeoutError", "NetworkError", "HTTPError"]);

function isRetryable(err: unknown): boolean {
  const name = (err as Error)?.name ?? "";
  const msg = (err as Error)?.message ?? "";
  return (
    RETRYABLE.has(name) ||
    /timeout|5\d\d|rate.?limit|econnreset|network/i.test(msg)
  );
}

export class ToolRuntime {
  constructor(private deps: { fetch?: typeof fetch } = {}) {
    this.deps.fetch = deps.fetch ?? globalThis.fetch;
  }

  async execute(tool: ToolDefinition, options: ExecuteOptions): Promise<ToolResult> {
    const started = Date.now();
    const policy: RetryPolicy = tool.retryPolicy;
    const maxAttempts = options.dryRun ? 1 : policy.attempts;
    let lastErr: unknown;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const data = await this.withTimeout(tool, options);
        return {
          ok: true,
          data,
          dryRun: Boolean(options.dryRun),
          durationMs: Date.now() - started,
          attempts: attempt,
        };
      } catch (err) {
        lastErr = err;
        const retryable = isRetryable(err);
        if (!retryable || attempt >= maxAttempts) {
          break;
        }
        await this.backoff(policy, attempt);
      }
    }

    return {
      ok: false,
      data: null,
      error: (lastErr as Error)?.message ?? "tool execution failed",
      dryRun: Boolean(options.dryRun),
      durationMs: Date.now() - started,
      attempts: maxAttempts,
    };
  }

  private async withTimeout(
    tool: ToolDefinition,
    options: ExecuteOptions,
  ): Promise<unknown> {
    const run = this.dispatch(tool, options);
    const timer = new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(Object.assign(new Error("tool timed out"), { name: "TimeoutError" })),
        tool.timeoutMs,
      ),
    );
    return Promise.race([run, timer]);
  }

  private async dispatch(
    tool: ToolDefinition,
    options: ExecuteOptions,
  ): Promise<unknown> {
    const impl = tool.implementation;
    switch (impl.kind) {
      case "mock": {
        switch (impl.behavior) {
          case "echo":
            return {
              tool: tool.name,
              risk: tool.risk,
              args: options.args,
              dryRun: options.dryRun,
              note: "mock echo — no external side effect",
            };
          case "fail":
            throw Object.assign(new Error(`mock failure for ${tool.name}`), { name: "HTTPError" });
          case "slow":
            await sleep(1200);
            return { tool: tool.name, note: "completed after simulated latency" };
          case "require_approval":
            return {
              tool: tool.name,
              note: "would perform a high-risk action",
              args: options.args,
            };
          default:
            return { tool: tool.name, args: options.args };
        }
      }
      case "calculator": {
        const expr = String(options.args.expression ?? "");
        // Safe arithmetic evaluator (no eval) for the demo tool.
        const value = safeEval(expr);
        return { expression: expr, value };
      }
      case "http": {
        if (options.dryRun) {
          return { note: "dry run — HTTP request suppressed", url: impl.url };
        }
        const res = await this.deps.fetch!(impl.url, {
          method: impl.method,
          headers: { "content-type": "application/json" },
          body: impl.method === "GET" ? undefined : JSON.stringify(options.args),
        });
        if (!res.ok) {
          throw Object.assign(new Error(`HTTP ${res.status}`), { name: "HTTPError" });
        }
        const text = await res.text();
        try {
          return JSON.parse(text);
        } catch {
          return text;
        }
      }
      default:
        throw new Error(`unknown tool implementation: ${(impl as any)?.kind}`);
    }
  }

  private async backoff(policy: RetryPolicy, attempt: number): Promise<void> {
    const base =
      policy.strategy === "exponential_backoff"
        ? policy.initialDelayMs * 2 ** (attempt - 1)
        : policy.initialDelayMs;
    const delay = Math.min(base, policy.maxDelayMs);
    await sleep(delay);
  }
}

export function isRetryableError(err: unknown): boolean {
  return isRetryable(err);
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/** Minimal safe four-function evaluator for the `calculator` demo tool. */
function safeEval(expr: string): number {
  const cleaned = expr.replace(/[^0-9+\-*/().\s]/g, "");
  if (!/^[0-9+\-*/().\s]+$/.test(cleaned)) throw new Error("invalid expression");
  const fn = new Function(`"use strict"; return (${cleaned});`);
  const value = fn();
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error("invalid expression result");
  }
  return value;
}

export type { ToolRisk };
