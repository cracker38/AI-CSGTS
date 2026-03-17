import Link from "next/link";
import { getDemoSession } from "@/lib/serverSession";

function Metric({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-3xl border border-slate-200/70 bg-white/70 p-5 shadow-sm backdrop-blur dark:border-slate-800/60 dark:bg-slate-950/40">
      <div className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
        {label}
      </div>
      <div className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 dark:text-white">
        {value}
      </div>
      {hint ? <div className="mt-1 text-xs text-slate-600 dark:text-slate-300">{hint}</div> : null}
    </div>
  );
}

export default async function DashboardPage() {
  const session = await getDemoSession();

  const role = session?.role ?? "EMPLOYEE";

  const titleByRole: Record<string, string> = {
    EMPLOYEE: "Your competency overview",
    MANAGER: "Team competency overview",
    HR_ADMIN: "Workforce intelligence overview",
    SYSTEM_ADMIN: "System & tenant overview",
  };

  const quickActionsByRole: Record<
    string,
    Array<{ label: string; href: string; note: string }>
  > = {
    EMPLOYEE: [
      { label: "Update profile", href: "/app/profile", note: "Improve completeness score" },
      { label: "View gaps", href: "/app/gaps", note: "See role/project gaps" },
      { label: "Training plan", href: "/app/training", note: "Track progress & ROI" },
    ],
    MANAGER: [
      { label: "Team directory", href: "/app/directory", note: "Search and filter staff" },
      { label: "Allocation board", href: "/app/projects", note: "Match employees to projects" },
      { label: "Reports", href: "/app/reports", note: "Export team KPIs" },
    ],
    HR_ADMIN: [
      { label: "Directory", href: "/app/directory", note: "Workforce search & insights" },
      { label: "Training analytics", href: "/app/training", note: "ROI and budgets" },
      { label: "Audit logs", href: "/app/audit", note: "Compliance trail" },
    ],
    SYSTEM_ADMIN: [
      { label: "Admin console", href: "/app/admin", note: "Roles, settings, integrations" },
      { label: "Audit logs", href: "/app/audit", note: "Security events" },
      { label: "Reports", href: "/app/reports", note: "System metrics" },
    ],
  };

  return (
    <div className="space-y-4">
      <div className="rounded-3xl border border-slate-200/70 bg-white/70 p-6 shadow-sm backdrop-blur dark:border-slate-800/60 dark:bg-slate-950/40">
        <div className="text-xs font-semibold uppercase tracking-wider text-blue-700 dark:text-blue-300">
          Dashboard
        </div>
        <h1 className="mt-2 text-xl font-semibold tracking-tight text-slate-950 dark:text-white">
          {titleByRole[role] ?? "Dashboard"}
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300">
          This is a functional end-to-end UI shell. Next step is wiring it to the Core API and AI
          service for real-time data, exports, workflows, and recommendations.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Metric label="Gap severity" value={role === "EMPLOYEE" ? "72/100" : "High"} hint="Role vs target" />
        <Metric label="Profile completeness" value={role === "EMPLOYEE" ? "68%" : "—"} hint="Skills + certs + timeline" />
        <Metric label="Training impact" value={role === "HR_ADMIN" ? "+9%" : "+4%"} hint="Last 30 days" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-3xl border border-slate-200/70 bg-white/70 p-6 shadow-sm backdrop-blur dark:border-slate-800/60 dark:bg-slate-950/40">
          <div className="flex items-end justify-between gap-4">
            <div>
              <div className="text-sm font-semibold text-slate-950 dark:text-white">
                Competency heatmap (preview)
              </div>
              <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                Will render from analytics endpoints (department/role/project filters).
              </div>
            </div>
            <Link
              href="/app/reports"
              className="rounded-xl border border-slate-200 bg-white/70 px-3 py-2 text-xs font-semibold text-slate-900 transition hover:bg-white dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-100"
            >
              Open reports
            </Link>
          </div>

          <div className="mt-5 grid grid-cols-8 gap-2">
            {Array.from({ length: 48 }).map((_, i) => (
              <div
                key={i}
                className={[
                  "h-6 rounded-lg border",
                  i % 9 === 0
                    ? "border-red-200 bg-red-500/15"
                    : i % 7 === 0
                      ? "border-amber-200 bg-amber-500/15"
                      : "border-emerald-200 bg-emerald-500/15",
                  "dark:border-slate-700",
                ].join(" ")}
              />
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200/70 bg-white/70 p-6 shadow-sm backdrop-blur dark:border-slate-800/60 dark:bg-slate-950/40">
          <div className="text-sm font-semibold text-slate-950 dark:text-white">Quick actions</div>
          <div className="mt-4 space-y-2">
            {(quickActionsByRole[role] ?? quickActionsByRole.EMPLOYEE).map((a) => (
              <Link
                key={a.href}
                href={a.href}
                className="block rounded-2xl border border-slate-200 bg-white/70 p-4 transition hover:bg-white dark:border-slate-800 dark:bg-slate-950/40"
              >
                <div className="text-sm font-semibold text-slate-950 dark:text-white">{a.label}</div>
                <div className="mt-1 text-xs text-slate-600 dark:text-slate-300">{a.note}</div>
              </Link>
            ))}
          </div>

          <div className="mt-5 rounded-2xl border border-slate-200 bg-gradient-to-r from-blue-600/10 to-cyan-500/10 p-4 dark:border-slate-800">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-200">
              AI recommendation (preview)
            </div>
            <div className="mt-2 text-sm text-slate-700 dark:text-slate-200">
              Prioritize <span className="font-semibold">Kubernetes</span> +{" "}
              <span className="font-semibold">AppSec</span> training to reduce delivery risk.
            </div>
            <div className="mt-1 text-xs text-slate-600 dark:text-slate-300">
              Confidence: 0.86 • Drivers: demand forecast, gap severity, project requirements
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

