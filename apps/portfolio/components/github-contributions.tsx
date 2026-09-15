"use client";

import { useEffect, useState } from "react";

import { USER } from "@/lib/data";
import { FigCaption } from "@/components/panel";

const WEEKS = 53;
const DAYS = 7;
const CONTRIBUTING_EVENTS = new Set([
  "PushEvent",
  "PullRequestEvent",
  "PullRequestReviewEvent",
  "IssuesEvent",
]);

type Cell = { date: string; count: number };
type Status = "loading" | "ready" | "unavailable";

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function startOfGrid(today: Date) {
  const end = new Date(today);
  const start = new Date(end);
  start.setDate(end.getDate() - (WEEKS * DAYS - 1));
  // Align the first column to a Sunday.
  start.setDate(start.getDate() - start.getUTCDay());
  return start;
}

function levelFor(count: number) {
  if (count === 0) return 0;
  if (count <= 2) return 1;
  if (count <= 5) return 2;
  if (count <= 9) return 3;
  return 4;
}

export function GitHubContributions() {
  const [counts, setCounts] = useState<Map<string, number> | null>(null);
  const [status, setStatus] = useState<Status>("loading");
  const [range, setRange] = useState<{ from: string; to: string } | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const today = new Date();
      const start = startOfGrid(today);
      setRange({ from: isoDate(start), to: isoDate(today) });

      const buckets = new Map<string, number>();
      try {
        const pages = [1, 2, 3];
        const responses = await Promise.all(
          pages.map((page) =>
            fetch(
              `https://api.github.com/users/${USER.username}/events/public?per_page=100&page=${page}`,
              { headers: { Accept: "application/vnd.github+json" } }
            )
          )
        );

        for (const response of responses) {
          if (!response.ok) throw new Error(`GitHub responded ${response.status}`);
          const events: Array<{ type?: string; created_at?: string }> = await response.json();
          for (const event of events) {
            if (!event.type || !event.created_at) continue;
            if (!CONTRIBUTING_EVENTS.has(event.type)) continue;
            const day = event.created_at.slice(0, 10);
            buckets.set(day, (buckets.get(day) ?? 0) + 1);
          }
        }

        if (cancelled) return;
        setCounts(buckets);
        setStatus("ready");
      } catch {
        if (cancelled) return;
        setCounts(buckets.size ? buckets : null);
        setStatus("unavailable");
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const start = startOfGrid(new Date());
  const columns: Cell[][] = [];
  for (let week = 0; week < WEEKS; week += 1) {
    const column: Cell[] = [];
    for (let day = 0; day < DAYS; day += 1) {
      const date = new Date(start);
      date.setDate(start.getDate() + week * DAYS + day);
      const iso = isoDate(date);
      column.push({ date: iso, count: counts?.get(iso) ?? 0 });
    }
    columns.push(column);
  }

  const total = counts ? [...counts.values()].reduce((sum, n) => sum + n, 0) : 0;

  const monthLabels = columns.map((column, index) => {
    const first = column[0];
    if (!first) return "";
    const month = new Date(first.date).toLocaleString("en-US", {
      month: "short",
      timeZone: "UTC",
    });
    const previous = columns[index - 1]?.[0];
    const previousMonth = previous
      ? new Date(previous.date).toLocaleString("en-US", { month: "short", timeZone: "UTC" })
      : null;
    return month !== previousMonth ? month : "";
  });

  return (
    <div>
      <div className="hide-scrollbar overflow-x-auto pb-1">
        <div className="min-w-[660px]">
          <div className="mb-1 flex gap-[3px] pl-6">
            {monthLabels.map((label, index) => (
              <span
                key={index}
                className="w-[10px] shrink-0 font-mono text-[9px] uppercase tracking-normal text-muted-foreground"
              >
                {index % 4 === 0 ? label : ""}
              </span>
            ))}
          </div>
          <div className="flex gap-[3px]">
            <div className="flex w-6 shrink-0 flex-col gap-[3px] pt-[1px]">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day, index) => (
                <span
                  key={day}
                  className="h-[10px] font-mono text-[9px] leading-[10px] text-muted-foreground"
                >
                  {index % 2 === 1 ? day : ""}
                </span>
              ))}
            </div>
            {columns.map((column, columnIndex) => (
              <div key={columnIndex} className="flex flex-col gap-[3px]">
                {column.map((cell) => {
                  const level = levelFor(cell.count);
                  return (
                    <span
                      key={cell.date}
                      title={`${cell.date}: ${cell.count} contribution${cell.count === 1 ? "" : "s"}`}
                      className="size-[10px] border border-line"
                      style={{
                        backgroundColor: level
                          ? `color-mix(in oklab, var(--foreground) ${level * 22}%, transparent)`
                          : "var(--secondary)",
                        borderColor: level ? "transparent" : undefined,
                      }}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-4">
        <FigCaption num="3" className="border-t-0 pt-0">
          {status === "loading"
            ? "Loading contribution data from GitHub…"
            : `${total.toLocaleString()} public contributions, ${range?.from ?? "—"} – ${range?.to ?? "—"}. Source: GitHub (@${USER.username}).`}
          {status === "unavailable"
            ? " Live data unavailable right now — GitHub rate-limited this request."
            : ""}
        </FigCaption>

        <div className="hidden shrink-0 items-center gap-1.5 font-mono text-[10px] uppercase tracking-label text-muted-foreground sm:flex">
          Less
          {[0, 1, 2, 3, 4].map((level) => (
            <span
              key={level}
              className="size-[10px] border border-line"
              style={{
                backgroundColor: level
                  ? `color-mix(in oklab, var(--foreground) ${level * 22}%, transparent)`
                  : "var(--secondary)",
              }}
            />
          ))}
          More
        </div>
      </div>
    </div>
  );
}
