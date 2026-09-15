"use client";

import { useEffect, useState } from "react";

import { NAV, USER } from "@/lib/data";
import { ThemeToggle } from "@/components/theme-toggle";

export function SiteHeader() {
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(entry.target.id);
        }
      },
      { rootMargin: "-45% 0px -50% 0px", threshold: 0 }
    );

    for (const item of NAV) {
      const el = document.getElementById(item.id);
      if (el) observer.observe(el);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <header className="screen-line-bottom sticky top-0 z-40 border-x bg-background">
      <div className="flex h-14 items-center gap-4 px-4 sm:px-6">
        <a href="#top" className="group flex shrink-0 items-center gap-2">
          <span className="flex size-6 items-center justify-center border border-border bg-secondary font-mono text-[11px] font-medium text-foreground">
            MO
          </span>
          <span className="hidden font-mono text-xs uppercase tracking-label text-muted-foreground transition-colors group-hover:text-foreground sm:inline">
            {USER.displayName}
          </span>
        </a>

        <nav className="hide-scrollbar -mx-1 flex flex-1 items-center gap-1 overflow-x-auto px-1">
          {NAV.map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              aria-current={active === item.id ? "true" : undefined}
              className={`shrink-0 border px-2.5 py-1 font-mono text-[11px] uppercase tracking-label transition-colors ${
                active === item.id
                  ? "border-border bg-secondary text-foreground"
                  : "border-transparent text-muted-foreground hover:border-border hover:text-foreground"
              }`}
            >
              {item.label}
            </a>
          ))}
        </nav>

        <ThemeToggle />
      </div>
    </header>
  );
}
