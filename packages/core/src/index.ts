export * from "./types.js";
export * from "./id.js";

export const BRAINS = ["chatgpt", "gemini", "grok"] as const;

export function isBrainId(value: unknown): value is import("./types.js").BrainId {
  return value === "chatgpt" || value === "gemini" || value === "grok";
}
