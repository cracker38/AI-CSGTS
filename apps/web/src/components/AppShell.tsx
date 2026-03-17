"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";
import type { DemoSession } from "@/lib/demoSession";

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

function NavItem({ href, label }: { href: string; label: string }) {
  const pathname = usePathname();
  const active = pathname === href;
  return (
    <Link
      href={href}
      className={cx(
        "rounded-xl px-3 py-2 text-sm font-medium transition",
        active
          ? "bg-slate-100 text-slate-950 dark:bg-slate-900/50 dark:text-white"
          : "text-slate-700 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-200 dark:hover:bg-slate-900/50 dark:hover:text-white",
      )}
    >
      {label}
    </Link>
  );
}

export function AppShell({
  session,
  children,
}: {
  session: DemoSession;
  children: React.ReactNode;
}) {
  const showAdmin = session.role === "SYSTEM_ADMIN" || session.role === "HR_ADMIN";
  const [signingOut, setSigningOut] = useState(false);

  const tenantName = useMemo(() => "Demo Company", []);

  return (
    <div className="min-h-screen bg-grid">
      <div className="mx-auto flex max-w-7xl gap-4 px-4 py-4">
        <aside className="sticky top-4 hidden h-[calc(100vh-2rem)] w-72 shrink-0 flex-col rounded-3xl border border-slate-200/70 bg-white/70 p-4 shadow-sm backdrop-blur dark:border-slate-800/60 dark:bg-slate-950/40 md:flex">
          <Link href="/app/dashboard" className="flex items-center gap-2 px-2 py-2">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-500 shadow-lg shadow-blue-500/15" />
            <div className="leading-tight">
              <div className="text-sm font-semibold tracking-tight text-slate-950 dark:text-white">
                AI-CSGTS
              </div>
              <div className="text-xs text-slate-600 dark:text-slate-300">Enterprise Suite</div>
            </div>
          </Link>

          <div className="mt-4 space-y-1">
            <NavItem href="/app/dashboard" label="Dashboard" />
            <NavItem href="/app/directory" label="Directory" />
            <NavItem href="/app/profile" label="Competency Profile" />
            <NavItem href="/app/gaps" label="Skill Gap Analysis" />
            <NavItem href="/app/training" label="Training" />
            <NavItem href="/app/projects" label="Projects & Allocation" />
            <NavItem href="/app/reports" label="Reports" />
            <NavItem href="/app/audit" label="Audit & History" />
            {showAdmin ? <NavItem href="/app/admin" label="Admin" /> : null}
          </div>

          <div className="mt-auto rounded-2xl border border-slate-200 bg-white/70 p-4 text-sm dark:border-slate-800 dark:bg-slate-950/40">
            <div className="font-semibold text-slate-950 dark:text-white">Demo mode</div>
            <div className="mt-1 text-xs text-slate-600 dark:text-slate-300">
              You’re signed in as <span className="font-semibold">{session.role}</span>.
            </div>
            <div className="mt-3 flex gap-2">
              <Link
                href="/auth/login"
                className="inline-flex flex-1 items-center justify-center rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
              >
                Switch role
              </Link>
              <button
                type="button"
                disabled={signingOut}
                onClick={async () => {
                  setSigningOut(true);
                  try {
                    await fetch("/api/auth/logout", { method: "POST" });
                  } finally {
                    window.location.href = "/";
                  }
                }}
                className="inline-flex flex-1 items-center justify-center rounded-xl border border-slate-200 bg-white/70 px-3 py-2 text-xs font-semibold text-slate-900 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-100"
              >
                {signingOut ? "Signing out…" : "Sign out"}
              </button>
            </div>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <header className="rounded-3xl border border-slate-200/70 bg-white/70 p-4 shadow-sm backdrop-blur dark:border-slate-800/60 dark:bg-slate-950/40">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-slate-950 dark:text-white">
                  Welcome, {session.fullName}
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-300">
                  Role: {session.role} • Tenant: {tenantName}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="hidden w-72 md:block">
                  <div className="rounded-2xl border border-slate-200 bg-white/70 px-3 py-2 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-200">
                    Search (coming soon)
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white/70 px-3 py-2 text-xs font-semibold text-slate-700 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-200">
                  Notifications
                </div>
                <div className="hidden text-right md:block">
                  <div className="text-sm font-semibold text-slate-950 dark:text-white">
                    {session.fullName}
                  </div>
                  <div className="text-xs text-slate-600 dark:text-slate-300">{session.email}</div>
                </div>
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 shadow-lg shadow-blue-500/15" />
              </div>
            </div>
          </header>

          <main className="min-w-0">{children}</main>
        </div>
      </div>
    </div>
  );
}

