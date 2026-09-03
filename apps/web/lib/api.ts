"use client";

import { getToken, clearSession } from "./auth";

export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

/** Thin fetch wrapper that attaches the session token and normalizes errors. */
export async function api<T = unknown>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers = new Headers(init.headers);
  if (init.body) headers.set("content-type", "application/json");
  if (token) headers.set("authorization", `Bearer ${token}`);

  const res = await fetch(path, { ...init, headers });

  if (res.status === 401) {
    clearSession();
    if (typeof window !== "undefined" && !path.startsWith("/api/v1/auth")) {
      window.location.href = "/login";
    }
    throw new ApiError("Unauthorized", 401);
  }

  const text = await res.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    // Non-JSON error body (HTML error page, proxy 502, …): keep the status and
    // show a snippet instead of crashing the whole page.
    data = null;
  }

  if (!res.ok) {
    const body = data && typeof data === "object" ? data : null;
    // The reverse proxy returns `{ error, message, hint }` when the API is
    // unreachable — surface all of it, otherwise the failure looks like an
    // empty list.
    const detail =
      (typeof body?.message === "string" ? body.message : null) ??
      (typeof body?.error === "string" ? body.error : null) ??
      (text ? `Request failed (${res.status}): ${text.slice(0, 200)}` : `Request failed (${res.status})`);
    const hint = typeof body?.hint === "string" ? body.hint : null;
    throw new ApiError(hint ? `${detail} ${hint}` : detail, res.status);
  }
  return data as T;
}

export function fmtUsd(n: number): string {
  return `$${n.toFixed(n < 0.01 ? 4 : 2)}`;
}

export function fmtMs(ms: number | null): string {
  if (ms == null) return "—";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diff = Math.max(0, now - then);
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function fmtDateTime(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString();
}
