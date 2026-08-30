"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { getUser } from "@/lib/auth";

const NAV: { group: string; items: { href: string; label: string; icon: string }[] }[] = [
  {
    group: "",
    items: [{ href: "/dashboard", label: "Dashboard", icon: "▦" }],
  },
  {
    group: "Workspace",
    items: [
      { href: "/agents", label: "Agents", icon: "◆" },
      { href: "/workflows", label: "Workflows", icon: "⛓" },
      { href: "/runs", label: "Runs", icon: "▶" },
      { href: "/approvals", label: "Approvals", icon: "✓" },
      { href: "/tools", label: "Tools", icon: "⚙" },
      { href: "/integrations", label: "Integrations", icon: "⇄" },
      { href: "/knowledge", label: "Knowledge", icon: "▤" },
    ],
  },
  {
    group: "Observability",
    items: [
      { href: "/traces", label: "Traces", icon: "≋" },
      { href: "/costs", label: "Costs", icon: "$" },
    ],
  },
  {
    group: "Evaluation",
    items: [{ href: "/eval", label: "Evaluation", icon: "◐" }],
  },
  {
    group: "Governance",
    items: [
      { href: "/policies", label: "Policies", icon: "◈" },
      { href: "/audit", label: "Audit Logs", icon: "✎" },
      { href: "/members", label: "Members", icon: "◉" },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const user = getUser();

  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-base-800 bg-base-950">
      <div className="flex h-14 items-center gap-2 border-b border-base-800 px-4">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-accent text-sm font-bold text-white">
          A
        </div>
        <div className="flex flex-col leading-none">
          <span className="text-sm font-semibold text-slate-100">AgentOS</span>
          <span className="text-[10px] text-slate-500">agent platform</span>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-3">
        {NAV.map((section) => (
          <div key={section.group} className="mb-4">
            {section.group && (
              <div className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-600">
                {section.group}
              </div>
            )}
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const active = pathname === item.href || pathname.startsWith(item.href + "/");
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={`flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-[13px] transition-colors ${
                        active
                          ? "bg-base-800 text-slate-100"
                          : "text-slate-400 hover:bg-base-850 hover:text-slate-200"
                      }`}
                    >
                      <span className="w-4 text-center text-[12px] opacity-70">{item.icon}</span>
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-base-800 px-4 py-3">
        {user ? (
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-base-700 text-xs font-semibold text-slate-200">
              {user.name
                .split(" ")
                .map((p) => p[0])
                .slice(0, 2)
                .join("")}
            </div>
            <div className="flex min-w-0 flex-col leading-tight">
              <span className="truncate text-xs font-medium text-slate-200">{user.name}</span>
              <span className="truncate text-[10px] text-slate-500">{user.email}</span>
            </div>
          </div>
        ) : (
          <Link href="/login" className="text-xs text-slate-400 hover:text-slate-200">
            Sign in →
          </Link>
        )}
      </div>
    </aside>
  );
}
