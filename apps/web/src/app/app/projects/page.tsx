import { PageCard } from "@/components/PageCard";

export default function ProjectsPage() {
  return (
    <div className="space-y-4">
      <PageCard
        title="Projects & resource allocation"
        subtitle="AI-based matching, drag-and-drop assignments, overload detection, and availability planning."
      >
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2 rounded-3xl border border-slate-200/70 bg-white/70 p-5 shadow-sm backdrop-blur dark:border-slate-800/60 dark:bg-slate-950/40">
            <div className="flex items-end justify-between gap-4">
              <div>
                <div className="text-sm font-semibold text-slate-950 dark:text-white">
                  Project: Phoenix Revamp
                </div>
                <div className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                  Requirements: React(Adv)×2 • Node(Adv)×1 • QA(Inter)×1
                </div>
              </div>
              <button className="rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 px-3 py-2 text-xs font-semibold text-white shadow-lg shadow-blue-500/15 transition hover:brightness-110">
                AI match
              </button>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-white/70 p-4 dark:border-slate-800 dark:bg-slate-950/40">
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  Candidates (AI-ranked)
                </div>
                <div className="mt-3 space-y-2 text-sm">
                  {[
                    ["A. Kim", "92% fit"],
                    ["J. Doe", "88% fit"],
                    ["S. Rana", "77% fit"],
                  ].map((c) => (
                    <div
                      key={c[0]}
                      className="flex items-center justify-between rounded-xl border border-slate-200 bg-white/70 px-3 py-2 dark:border-slate-800 dark:bg-slate-950/40"
                    >
                      <div className="font-semibold text-slate-900 dark:text-slate-100">{c[0]}</div>
                    <div className="text-xs font-semibold text-blue-700 dark:text-blue-300">{c[1]}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white/70 p-4 dark:border-slate-800 dark:bg-slate-950/40">
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  Assignment board (preview)
                </div>
                <div className="mt-3 space-y-2 text-sm">
                  {[
                    "React(Adv) Slot #1",
                    "React(Adv) Slot #2",
                    "Node(Adv) Slot",
                    "QA(Inter) Slot",
                  ].map((s) => (
                    <div
                      key={s}
                      className="flex items-center justify-between rounded-xl border border-slate-200 bg-white/70 px-3 py-2 dark:border-slate-800 dark:bg-slate-950/40"
                    >
                      <div className="text-slate-700 dark:text-slate-200">{s}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">Unassigned</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-500/10 p-4 text-sm text-amber-900 dark:border-amber-900/40 dark:text-amber-200">
              Conflict: J. Doe overloaded (2 projects) → suggestion: swap with S. Rana
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200/70 bg-white/70 p-5 shadow-sm backdrop-blur dark:border-slate-800/60 dark:bg-slate-950/40">
            <div className="text-sm font-semibold text-slate-950 dark:text-white">
              Availability calendar
            </div>
            <div className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              Coming next: calendar view + time-off + allocation percentages.
            </div>
            <div className="mt-4 grid grid-cols-7 gap-2">
              {Array.from({ length: 28 }).map((_, i) => (
                <div
                  key={i}
                  className={[
                    "h-8 rounded-xl border",
                    i % 8 === 0 ? "border-red-200 bg-red-500/10" : "border-slate-200 bg-white/60",
                    "dark:border-slate-800 dark:bg-slate-950/20",
                  ].join(" ")}
                />
              ))}
            </div>
          </div>
        </div>
      </PageCard>
    </div>
  );
}

