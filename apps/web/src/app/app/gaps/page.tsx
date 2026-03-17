import { PageCard } from "@/components/PageCard";

const rows = [
  { skill: "Node.js", required: "Advanced", current: "Advanced", gap: 0, status: "Green" },
  { skill: "System Design", required: "Expert", current: "Advanced", gap: -1, status: "Yellow" },
  { skill: "Kubernetes", required: "Advanced", current: "Beginner", gap: -2, status: "Red" },
];

export default function GapsPage() {
  return (
    <PageCard
      title="Skill gap analysis"
      subtitle="Compare employee skills vs required skills (role/project). Exports will be wired to PDF/Excel."
    >
      <div className="flex flex-wrap gap-2">
        <div className="rounded-2xl border border-slate-200 bg-white/70 px-3 py-2 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-200">
          Scope: Role (Senior Backend)
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white/70 px-3 py-2 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-200">
          Filter: Department
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white/70 px-3 py-2 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-200">
          Export: PDF / Excel
        </div>
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-600 dark:bg-slate-950/50 dark:text-slate-300">
            <tr>
              <th className="px-4 py-3">Skill</th>
              <th className="px-4 py-3">Required</th>
              <th className="px-4 py-3">Current</th>
              <th className="px-4 py-3">Gap</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white/70 dark:divide-slate-800 dark:bg-slate-950/20">
            {rows.map((r) => (
              <tr key={r.skill} className="hover:bg-white dark:hover:bg-slate-950/40">
                <td className="px-4 py-3 font-semibold text-slate-900 dark:text-slate-100">
                  {r.skill}
                </td>
                <td className="px-4 py-3 text-slate-700 dark:text-slate-200">{r.required}</td>
                <td className="px-4 py-3 text-slate-700 dark:text-slate-200">{r.current}</td>
                <td className="px-4 py-3 text-slate-700 dark:text-slate-200">{r.gap}</td>
                <td className="px-4 py-3">
                  <span
                    className={[
                      "inline-flex rounded-full px-2 py-1 text-xs font-semibold",
                      r.status === "Red"
                        ? "bg-red-500/15 text-red-700 dark:text-red-200"
                        : r.status === "Yellow"
                          ? "bg-amber-500/15 text-amber-800 dark:text-amber-200"
                          : "bg-emerald-500/15 text-emerald-800 dark:text-emerald-200",
                    ].join(" ")}
                  >
                    {r.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white/70 p-4 dark:border-slate-800 dark:bg-slate-950/40">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
            Severity score
          </div>
          <div className="mt-2 text-2xl font-semibold text-slate-950 dark:text-white">72 / 100</div>
          <div className="mt-1 text-xs text-slate-600 dark:text-slate-300">High</div>
        </div>
        <div className="md:col-span-2 rounded-2xl border border-slate-200 bg-gradient-to-r from-blue-600/10 to-cyan-500/10 p-4 dark:border-slate-800">
          <div className="text-sm font-semibold text-slate-950 dark:text-white">
            AI recommendations (preview)
          </div>
          <ul className="mt-2 space-y-1 text-sm text-slate-700 dark:text-slate-200">
            <li>Training: “Kubernetes for Developers” (confidence 0.86)</li>
            <li>Mentorship: “Platform Shadowing” (confidence 0.64)</li>
          </ul>
        </div>
      </div>
    </PageCard>
  );
}

