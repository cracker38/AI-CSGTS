import { PageCard } from "@/components/PageCard";

export default function ReportsPage() {
  return (
    <div className="space-y-4">
      <PageCard
        title="Reporting & dashboards"
        subtitle="Role-based dashboards, custom report builder, and exports (PDF/Excel/PowerPoint)."
      >
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2 rounded-3xl border border-slate-200/70 bg-white/70 p-5 shadow-sm backdrop-blur dark:border-slate-800/60 dark:bg-slate-950/40">
            <div className="text-sm font-semibold text-slate-950 dark:text-white">
              Chart preview
            </div>
            <div className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              Next step: wire real analytics + charts library (Recharts) with saved filters/views.
            </div>
            <div className="mt-4 grid grid-cols-12 items-end gap-2">
              {[22, 40, 28, 65, 52, 35, 70, 58, 44, 62, 50, 72].map((h, i) => (
                <div
                  key={i}
                  className="rounded-xl border border-blue-200 bg-gradient-to-t from-blue-600/30 to-cyan-500/15 dark:border-slate-700"
                  style={{ height: `${h * 2}px` }}
                />
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200/70 bg-white/70 p-5 shadow-sm backdrop-blur dark:border-slate-800/60 dark:bg-slate-950/40">
            <div className="text-sm font-semibold text-slate-950 dark:text-white">
              Export
            </div>
            <div className="mt-4 space-y-2">
              {["PDF", "Excel", "PowerPoint"].map((x) => (
                <button
                  key={x}
                  className="w-full rounded-xl border border-slate-200 bg-white/70 px-3 py-2 text-sm font-semibold text-slate-900 transition hover:bg-white dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-100"
                >
                  Export {x}
                </button>
              ))}
            </div>
            <div className="mt-4 text-xs text-slate-600 dark:text-slate-300">
              Exports will be generated server-side (API) for consistency and compliance.
            </div>
          </div>
        </div>
      </PageCard>

      <PageCard title="Custom report builder" subtitle="Build KPIs with filters, group-by, and saved views.">
        <div className="rounded-2xl border border-slate-200 bg-white/70 p-4 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-200">
          Coming next: query builder UI + permissions-aware fields.
        </div>
      </PageCard>
    </div>
  );
}

