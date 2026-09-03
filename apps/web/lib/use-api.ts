"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "./api";

/** A failed request and an empty collection look identical in a UI that
 *  swallows errors — the console used to render both as "no rows". */
export const GENERIC_LIST_ERROR = "Could not load data from the API";

export interface ApiResource<T> {
  /** `null` while the first request is in flight or after a failure. */
  data: T | null;
  /** Human-readable failure reason, or `null` when the last request succeeded. */
  error: string | null;
  /** True until the first request settles. */
  loading: boolean;
  /** Re-issue the request. */
  reload: () => void;
  /** Local override (e.g. optimistic updates after a mutation). */
  setData: (next: T | null) => void;
}

/**
 * Loads a JSON resource from the API and — critically — surfaces failures
 * instead of collapsing them into an empty list.
 *
 * @param path API path (e.g. `/api/v1/agents`), or `null` to skip loading.
 */
export function useApi<T>(path: string | null): ApiResource<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(path !== null);
  const [nonce, setNonce] = useState(0);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    if (path === null) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);

    api<T>(path)
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((err) => {
        if (cancelled) return;
        setData(null);
        setError(err instanceof Error ? err.message : GENERIC_LIST_ERROR);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [path, nonce]);

  return { data, error, loading, reload, setData };
}
