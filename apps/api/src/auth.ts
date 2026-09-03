import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import type { FastifyInstance, FastifyRequest } from "fastify";
import type { User } from "@agentos/core";

/**
 * Minimal, dependency-free auth (PRD §9 MVP: email/password + sessions).
 *
 * Passwords are hashed with scrypt (salted, key-stretched). Sessions are
 * HMAC-signed tokens so no server-side session store is required. In a
 * production deployment this would be replaced by an identity provider and/or
 * OAuth/OIDC (Google, GitHub, SSO) — see PRD §9.
 */

const SESSION_SECRET = process.env.SESSION_SECRET ?? "agentos-dev-secret-change-me";
const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const candidate = scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, "hex");
  return candidate.length === expected.length && timingSafeEqual(candidate, expected);
}

function sign(payload: string): string {
  return createHmac("sha256", SESSION_SECRET).update(payload).digest("hex");
}

export function issueToken(userId: string): string {
  const expires = Date.now() + TOKEN_TTL_MS;
  const payload = Buffer.from(JSON.stringify({ uid: userId, exp: expires })).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function verifyToken(token: string): string | null {
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  const expected = Buffer.from(sign(payload));
  const provided = Buffer.from(sig);
  // `timingSafeEqual` throws (500) instead of returning false when the buffers
  // differ in length, which is exactly what a malformed, truncated, or
  // foreign token produces. A bad token must be a 401 so the console can log
  // the user out, never a 500.
  if (provided.length !== expected.length) return null;
  if (!timingSafeEqual(provided, expected)) return null;
  try {
    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString()) as { uid: string; exp: number };
    if (decoded.exp < Date.now()) return null;
    return decoded.uid;
  } catch {
    return null;
  }
}

declare module "fastify" {
  interface FastifyRequest {
    user?: User;
  }
}

export interface AuthOptions {
  loadUser: (id: string) => User | undefined;
}

/** Fastify hook that resolves `Authorization: Bearer <token>` to a user. */
export function registerAuth(app: FastifyInstance, opts: AuthOptions): void {
  app.decorateRequest("user", undefined);
  app.addHook("onRequest", async (req: FastifyRequest) => {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) return;
    const uid = verifyToken(header.slice("Bearer ".length));
    if (!uid) return;
    req.user = opts.loadUser(uid);
  });
}

export function requireAuth(req: FastifyRequest): User {
  if (!req.user) {
    throw Object.assign(new Error("Unauthorized"), { statusCode: 401 });
  }
  return req.user;
}
