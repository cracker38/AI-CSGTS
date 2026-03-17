import Link from "next/link";

export default function PendingPage() {
  return (
    <div className="min-h-screen bg-grid px-4 py-10">
      <div className="mx-auto max-w-lg">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200"
        >
          <span className="h-8 w-8 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 shadow-lg shadow-blue-500/15" />
          <span className="font-semibold">AI-CSGTS</span>
        </Link>

        <div className="mt-6 rounded-3xl border border-slate-200/70 bg-white/70 p-6 shadow-xl shadow-slate-900/5 backdrop-blur dark:border-slate-800/60 dark:bg-slate-950/40">
          <div className="text-xs font-semibold uppercase tracking-wider text-blue-700 dark:text-blue-300">
            Approval workflow
          </div>
          <h1 className="mt-2 text-xl font-semibold tracking-tight text-slate-950 dark:text-white">
            Your access request is pending HR approval
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
            Once approved, you’ll receive access based on your assigned role. For demo preview, you
            can sign in using demo mode.
          </p>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/auth/login"
              className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/15 transition hover:brightness-110"
            >
              Sign in (demo)
            </Link>
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white/70 px-4 py-2.5 text-sm font-semibold text-slate-900 shadow-sm backdrop-blur transition hover:bg-white dark:border-slate-700 dark:bg-slate-950/40 dark:text-slate-100"
            >
              Back to landing
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

