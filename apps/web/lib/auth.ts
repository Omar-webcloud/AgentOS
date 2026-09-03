"use client";

const TOKEN_KEY = "agentos_token";
const USER_KEY = "agentos_user";
const ACCOUNTS_KEY = "agentos_google_accounts";

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: string;
  organizationId: string;
  avatarUrl?: string | null;
  authProvider?: string;
}

export interface StoredGoogleAccount {
  email: string;
  name: string;
  picture?: string;
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setSession(token: string, user: SessionUser): void {
  window.localStorage.setItem(TOKEN_KEY, token);
  window.localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function getUser(): SessionUser | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SessionUser;
  } catch {
    return null;
  }
}

export function clearSession(): void {
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(USER_KEY);
}

export function rememberGoogleAccount(account: StoredGoogleAccount): void {
  const existing = listGoogleAccounts().filter((a) => a.email !== account.email);
  window.localStorage.setItem(ACCOUNTS_KEY, JSON.stringify([account, ...existing].slice(0, 6)));
}

export function listGoogleAccounts(): StoredGoogleAccount[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(ACCOUNTS_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as StoredGoogleAccount[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
