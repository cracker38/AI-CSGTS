import { PageCard } from "@/components/PageCard";

const rows = [
  { at: "2026-03-17 09:03", actor: "HR Admin", event: "USER_APPROVED", entity: "Jane Doe" },
  { at: "2026-03-17 08:59", actor: "System", event: "LOGIN_SUCCESS", entity: "demo@company.com" },
  { at: "2026-03-17 08:41", actor: "Manager", event: "ASSESSMENT_UPDATED", entity: "Kubernetes" },
];

export default function AuditPage() {
  return (
    <PageCard
      title="Audit & history"
      subtitle="Compliance-ready, immutable audit logs with before/after diffs and actor details."
    >
      <div className="flex flex-wrap gap-2">
        <div className="rounded-2xl border border-slate-200 bg-white/70 px-3 py-2 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-200">
          Filter: Event type
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white/70 px-3 py-2 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-200">
          Filter: Actor
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white/70 px-3 py-2 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-200">
          Export: CSV
        </div>
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-600 dark:bg-slate-950/50 dark:text-slate-300">
            <tr>
              <th className="px-4 py-3">Timestamp</th>
              <th className="px-4 py-3">Actor</th>
              <th className="px-4 py-3">Event</th>
              <th className="px-4 py-3">Entity</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white/70 dark:divide-slate-800 dark:bg-slate-950/20">
            {rows.map((r) => (
              <tr key={r.at + r.event} className="hover:bg-white dark:hover:bg-slate-950/40">
                <td className="px-4 py-3 text-slate-700 dark:text-slate-200">{r.at}</td>
                <td className="px-4 py-3 font-semibold text-slate-900 dark:text-slate-100">{r.actor}</td>
                <td className="px-4 py-3 text-slate-700 dark:text-slate-200">{r.event}</td>
                <td className="px-4 py-3 text-slate-700 dark:text-slate-200">{r.entity}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PageCard>
  );
}

