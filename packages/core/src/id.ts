import { randomUUID, createHash } from "node:crypto";
import type { ID } from "./types.js";

/** Human-readable, sortable, collision-resistant IDs (e.g. `run_9f3c...`). */
export function makeId(prefix: string): ID {
  return `${prefix}_${randomUUID().replace(/-/g, "").slice(0, 16)}`;
}

/** Deterministic ID from a string — used for idempotency keys and dedupe. */
export function stableId(prefix: string, seed: string): ID {
  const hash = createHash("sha256").update(seed).digest("hex").slice(0, 16);
  return `${prefix}_${hash}`;
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export function nowIso(): string {
  return new Date().toISOString();
}
