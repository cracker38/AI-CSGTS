import { PageCard } from "@/components/PageCard";
import { getDemoSession } from "@/lib/serverSession";

export default async function AdminPage() {
  const session = await getDemoSession();
  const allowed = session?.role === "SYSTEM_ADMIN" || session?.role === "HR_ADMIN";

  return (
    <div className="space-y-4">
      <PageCard
        title="Admin & configuration"
        subtitle="Skill taxonomy management, role permissions, integration settings, and system health."
      >
        {!allowed ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-500/10 p-4 text-sm text-amber-900 dark:border-amber-900/40 dark:text-amber-200">
            This section is restricted. Sign in as HR Admin or System Admin in demo mode to view admin tools.
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-3">
            {[
              { title: "Skill taxonomy", desc: "Categories, aliases, relationships." },
              { title: "Role permissions", desc: "Permission matrix and RBAC templates." },
              { title: "Integrations", desc: "HRIS / LMS / APIs (SSO-ready)." },
              { title: "Approvals", desc: "Pending user approvals and workflows." },
              { title: "System health", desc: "Service uptime, queues, DB health." },
              { title: "Audit settings", desc: "Retention and compliance controls." },
            ].map((x) => (
              <div
                key={x.title}
                className="rounded-3xl border border-slate-200/70 bg-white/70 p-5 shadow-sm backdrop-blur dark:border-slate-800/60 dark:bg-slate-950/40"
              >
                <div className="text-sm font-semibold text-slate-950 dark:text-white">{x.title}</div>
                <div className="mt-2 text-sm text-slate-600 dark:text-slate-300">{x.desc}</div>
                <button className="mt-4 w-full rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100">
                  Open
                </button>
              </div>
            ))}
          </div>
        )}
      </PageCard>
    </div>
  );
}

