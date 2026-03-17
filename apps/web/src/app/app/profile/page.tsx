import { PageCard } from "@/components/PageCard";

export default function ProfilePage() {
  return (
    <div className="space-y-4">
      <PageCard
        title="Competency profile"
        subtitle="Self-assessment, manager assessment, endorsements, certifications, and experience timeline."
      >
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white/70 p-4 dark:border-slate-800 dark:bg-slate-950/40">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
              Profile completeness
            </div>
            <div className="mt-2 text-2xl font-semibold text-slate-950 dark:text-white">68%</div>
            <div className="mt-3 h-2 w-full rounded-full bg-slate-200 dark:bg-slate-800">
              <div className="h-2 w-[68%] rounded-full bg-gradient-to-r from-blue-600 to-cyan-500" />
            </div>
            <div className="mt-2 text-xs text-slate-600 dark:text-slate-300">
              Add certifications + last-used dates to increase accuracy.
            </div>
          </div>

          <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white/70 p-4 dark:border-slate-800 dark:bg-slate-950/40">
            <div className="text-sm font-semibold text-slate-950 dark:text-white">Skills (preview)</div>
            <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-600 dark:bg-slate-950/50 dark:text-slate-300">
                  <tr>
                    <th className="px-3 py-2">Skill</th>
                    <th className="px-3 py-2">Level</th>
                    <th className="px-3 py-2">Self</th>
                    <th className="px-3 py-2">Manager</th>
                    <th className="px-3 py-2">Endorse</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white/70 dark:divide-slate-800 dark:bg-slate-950/20">
                  {[
                    ["Node.js", "Advanced", 4, 4, 3],
                    ["System Design", "Advanced", 4, 3, 2],
                    ["Kubernetes", "Beginner", 2, 1, 0],
                  ].map((r) => (
                    <tr key={r[0]} className="hover:bg-white dark:hover:bg-slate-950/40">
                      <td className="px-3 py-2 font-semibold text-slate-900 dark:text-slate-100">{r[0]}</td>
                      <td className="px-3 py-2 text-slate-700 dark:text-slate-200">{r[1]}</td>
                      <td className="px-3 py-2 text-slate-700 dark:text-slate-200">{r[2]}</td>
                      <td className="px-3 py-2 text-slate-700 dark:text-slate-200">{r[3]}</td>
                      <td className="px-3 py-2 text-slate-700 dark:text-slate-200">{r[4]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </PageCard>

      <div className="grid gap-4 lg:grid-cols-2">
        <PageCard title="Certifications" subtitle="Upload and track certification expirations.">
          <div className="rounded-2xl border border-slate-200 bg-white/70 p-4 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-200">
            Coming next: file upload + validation + alerts.
          </div>
        </PageCard>
        <PageCard title="Experience timeline" subtitle="Role history and project experience.">
          <div className="rounded-2xl border border-slate-200 bg-white/70 p-4 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-200">
            Coming next: timeline editor + manager verification.
          </div>
        </PageCard>
      </div>
    </div>
  );
}

