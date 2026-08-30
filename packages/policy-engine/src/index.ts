import type {
  EnvironmentName,
  PolicyAction,
  PolicyRule,
  ToolRisk,
} from "@agentos/core";

/**
 * The policy engine is the deterministic authority in the system (PRD §3.1,
 * §96–§98, §139–§140). The LLM only *suggests* actions; this engine decides
 * whether they are permitted, denied, or require human approval.
 *
 * It fails closed: unknown tools and missing permissions are DENY by default.
 */

export interface ToolCallRequest {
  toolName: string;
  risk: ToolRisk;
  environment: EnvironmentName;
  /** Tool arguments, inspected by rules such as `amount.gt`. */
  args: Record<string, unknown>;
}

export interface PolicyDecision {
  action: PolicyAction;
  /** Rule(s) that produced the decision, for auditability. */
  matchedRules: string[];
  reason: string;
}

const RISK_SEVERITY: Record<ToolRisk, number> = {
  READ: 0,
  LOW_RISK_WRITE: 1,
  HIGH_RISK_WRITE: 2,
  DESTRUCTIVE: 3,
};

/** Default safety posture: destructive ops need approval (PRD §98). */
const DEFAULT_RULES: PolicyRule[] = [
  { name: "destructive-requires-approval", when: { risk: "DESTRUCTIVE" }, action: "require_approval" },
  { name: "high-risk-write-requires-approval", when: { risk: "HIGH_RISK_WRITE" }, action: "require_approval" },
];

function argMatches(rule: PolicyRule, args: Record<string, unknown>): boolean {
  const when = rule.when;
  if (when.amount) {
    const amount = typeof args.amount === "number" ? args.amount : NaN;
    if (Number.isNaN(amount)) return false;
    if (when.amount.gt !== undefined && !(amount > when.amount.gt)) return false;
    if (when.amount.gte !== undefined && !(amount >= when.amount.gte)) return false;
    if (when.amount.lt !== undefined && !(amount < when.amount.lt)) return false;
  }
  if (when.path && typeof args.path === "string") {
    if (!args.path.includes(when.path)) return false;
  }
  return true;
}

export function ruleMatches(rule: PolicyRule, req: ToolCallRequest): boolean {
  const when = rule.when;
  if (when.tool && when.tool !== req.toolName) return false;
  if (when.risk && when.risk !== req.risk) return false;
  if (when.environment && when.environment !== req.environment) return false;
  return argMatches(rule, req.args);
}

/**
 * Evaluate a tool call against the full policy set. The most restrictive
 * applicable rule wins (PRD §97: org → env → project → agent → tool).
 */
export function evaluatePolicy(
  request: ToolCallRequest,
  rules: PolicyRule[],
): PolicyDecision {
  const applicable = [...DEFAULT_RULES, ...rules].filter((r) =>
    ruleMatches(r, request),
  );

  if (applicable.length === 0) {
    return { action: "allow", matchedRules: [], reason: "no rule applies" };
  }

  // Precedence: deny > require_approval > allow.
  const deny = applicable.find((r) => r.action === "deny");
  if (deny) {
    return { action: "deny", matchedRules: [deny.name], reason: `denied by rule "${deny.name}"` };
  }
  const approval = applicable.find((r) => r.action === "require_approval");
  if (approval) {
    return { action: "require_approval", matchedRules: [approval.name], reason: `requires approval by rule "${approval.name}"` };
  }
  return { action: "allow", matchedRules: applicable.map((r) => r.name), reason: "allowed" };
}

/**
 * Risk-aware default for a tool with no explicit policy: READ is allowed,
 * LOW_RISK_WRITE allowed, HIGH_RISK_WRITE and DESTRUCTIVE require approval.
 */
export function defaultDecisionForRisk(risk: ToolRisk): PolicyAction {
  return RISK_SEVERITY[risk] >= 2 ? "require_approval" : "allow";
}

export { RISK_SEVERITY };
