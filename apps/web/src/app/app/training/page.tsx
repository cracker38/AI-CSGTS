import { PageCard } from "@/components/PageCard";

export default function TrainingPage() {
  return (
    <div className="space-y-4">
      <PageCard
        title="Training recommendations"
        subtitle="Personalized suggestions, progress tracking, budget estimation, and ROI analytics."
      >
        <div className="grid gap-4 lg:grid-cols-3">
          {[
            { title: "Kubernetes for Developers", provider: "Coursera", roi: "High", cost: "$49" },
            { title: "AppSec Foundations", provider: "Udemy", roi: "Medium", cost: "$19" },
            { title: "System Design Mastery", provider: "Internal", roi: "High", cost: "$0" },
          ].map((t) => (
            <div
              key={t.title}
              className="rounded-3xl border border-slate-200/70 bg-white/70 p-5 shadow-sm backdrop-blur dark:border-slate-800/60 dark:bg-slate-950/40"
            >
              <div className="text-sm font-semibold text-slate-950 dark:text-white">{t.title}</div>
              <div className="mt-1 text-xs text-slate-600 dark:text-slate-300">{t.provider}</div>
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-2xl border border-slate-200 bg-white/70 p-3 dark:border-slate-800 dark:bg-slate-950/40">
                  <div className="text-xs text-slate-600 dark:text-slate-300">Est. cost</div>
                  <div className="mt-1 font-semibold text-slate-900 dark:text-slate-100">{t.cost}</div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white/70 p-3 dark:border-slate-800 dark:bg-slate-950/40">
                  <div className="text-xs text-slate-600 dark:text-slate-300">ROI</div>
                  <div className="mt-1 font-semibold text-slate-900 dark:text-slate-100">{t.roi}</div>
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <button className="flex-1 rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100">
                  Enroll
                </button>
                <button className="flex-1 rounded-xl border border-slate-200 bg-white/70 px-3 py-2 text-xs font-semibold text-slate-900 transition hover:bg-white dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-100">
                  Details
                </button>
              </div>
            </div>
          ))}
        </div>
      </PageCard>

      <PageCard title="Progress tracking" subtitle="Track completion and impact across time.">
        <div className="rounded-2xl border border-slate-200 bg-white/70 p-4 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-200">
          Coming next: progress timeline, completion certificates, and ROI dashboard.
        </div>
      </PageCard>
    </div>
  );
}

