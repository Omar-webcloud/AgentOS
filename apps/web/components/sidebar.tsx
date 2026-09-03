"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { getUser, clearSession } from "@/lib/auth";
import { Mark } from "@/components/mark";

const NAV: { href: string; label: string }[] = [
  { href: "/dashboard", label: "Outline" },
  { href: "/runs", label: "Triggers" },
  { href: "/brains", label: "Brains" },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const user = getUser();

  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-base-800 bg-base-950">
      <div className="flex h-14 items-center gap-2.5 border-b border-base-800 px-4">
        <Mark className="h-7 w-7" />
        <div className="flex flex-col leading-none">
          <span className="font-serif text-[15px] text-paper">AgentOS</span>
          <span className="mt-0.5 text-[10px] uppercase tracking-[0.18em] text-slate-500">outline</span>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4">
        <ul className="space-y-0.5">
          {NAV.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`block rounded-lg px-3 py-2 text-[13px] transition-colors ${
                    active ? "bg-base-800 text-paper" : "text-slate-400 hover:bg-base-850 hover:text-paper"
                  }`}
                >
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-base-800 px-4 py-3">
        {user ? (
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-copper/20 text-xs font-semibold text-copper">
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
            <button
              onClick={() => {
                clearSession();
                router.push("/login");
              }}
              className="ml-auto text-xs text-slate-400 hover:text-slate-200"
              title="Log out"
            >
              ⎋
            </button>
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
