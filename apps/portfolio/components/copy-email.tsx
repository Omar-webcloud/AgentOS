"use client";

import { useState } from "react";

import { USER } from "@/lib/data";

export function CopyEmail({ className }: { className?: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(USER.email);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      className={
        className ??
        "border border-border bg-card px-2 py-0.5 font-mono text-[11px] text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
      }
    >
      {copied ? "copied ✓" : "copy"}
    </button>
  );
}
