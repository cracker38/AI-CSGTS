import { PageCard } from "@/components/PageCard";

const rows = [
  { name: "Jane Doe", dept: "Platform", role: "Senior Engineer", gaps: "High", status: "Active" },
  { name: "A. Kim", dept: "Cloud", role: "Engineer", gaps: "Medium", status: "Active" },
  { name: "S. Rana", dept: "Security", role: "Analyst", gaps: "Low", status: "Active" },
];

export default function DirectoryPage() {
  return (
    <PageCard
      title="User directory"
      subtitle="Search, filter, and manage employees. (Bulk import/export + approvals will be wired to the API.)"
    >
      <div className="flex flex-wrap gap-2">
        <div className="rounded-2xl border border-slate-200 bg-white/70 px-3 py-2 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-200">
          Filter: Department
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white/70 px-3 py-2 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-200">
          Filter: Role
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white/70 px-3 py-2 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-200">
          Export: PDF / Excel
        </div>
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-600 dark:bg-slate-950/50 dark:text-slate-300">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Department</th>
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">Gap</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white/70 dark:divide-slate-800 dark:bg-slate-950/20">
            {rows.map((r) => (
              <tr key={r.name} className="hover:bg-white dark:hover:bg-slate-950/40">
                <td className="px-4 py-3 font-semibold text-slate-900 dark:text-slate-100">
                  {r.name}
                </td>
                <td className="px-4 py-3 text-slate-700 dark:text-slate-200">{r.dept}</td>
                <td className="px-4 py-3 text-slate-700 dark:text-slate-200">{r.role}</td>
                <td className="px-4 py-3">
                  <span
                    className={[
                      "inline-flex rounded-full px-2 py-1 text-xs font-semibold",
                      r.gaps === "High"
                        ? "bg-red-500/15 text-red-700 dark:text-red-200"
                        : r.gaps === "Medium"
                          ? "bg-amber-500/15 text-amber-800 dark:text-amber-200"
                          : "bg-emerald-500/15 text-emerald-800 dark:text-emerald-200",
                    ].join(" ")}
                  >
                    {r.gaps}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-700 dark:text-slate-200">{r.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PageCard>
  );
}

