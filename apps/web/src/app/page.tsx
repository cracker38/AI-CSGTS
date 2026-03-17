import Link from "next/link";

function GradientPill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-slate-200/70 bg-white/60 px-3 py-1 text-xs font-medium text-slate-700 shadow-sm backdrop-blur dark:border-slate-700/60 dark:bg-slate-950/40 dark:text-slate-200">
      {children}
    </span>
  );
}

function PrimaryButton({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/15 transition hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-blue-400/60"
    >
      {children}
    </Link>
  );
}

function SecondaryButton({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white/70 px-4 py-2.5 text-sm font-semibold text-slate-900 shadow-sm backdrop-blur transition hover:bg-white focus:outline-none focus:ring-2 focus:ring-blue-400/50 dark:border-slate-700 dark:bg-slate-950/40 dark:text-slate-100"
    >
      {children}
    </Link>
  );
}

const features = [
  {
    title: "Competency Profiles",
    desc: "Self + manager assessments, endorsements, certifications, and completeness tracking.",
  },
  {
    title: "Skill Gap Analysis",
    desc: "Compare required vs current skills with severity scoring and exportable reports.",
  },
  {
    title: "AI Analytics",
    desc: "Forecast demand, analyze skill decay, generate heatmaps, and run what-if scenarios.",
  },
  {
    title: "Training ROI",
    desc: "Personalized learning paths, progress tracking, budget estimation, ROI insights.",
  },
  {
    title: "Resource Allocation",
    desc: "AI-based matching to projects, conflict detection, and availability planning.",
  },
  {
    title: "Audit & Compliance",
    desc: "Immutable audit trail, change tracking, and compliance-ready activity logs.",
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-grid">
      <header className="sticky top-0 z-30 border-b border-slate-200/60 bg-white/60 backdrop-blur dark:border-slate-800/60 dark:bg-slate-950/40">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link href="/" className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 shadow-lg shadow-blue-500/15" />
            <div className="leading-tight">
              <div className="text-sm font-semibold tracking-tight">AI-CSGTS</div>
              <div className="text-xs text-slate-600 dark:text-slate-300">
                Competency & Skill Gap Tracking
              </div>
            </div>
          </Link>
          <nav className="hidden items-center gap-6 text-sm text-slate-700 dark:text-slate-200 md:flex">
            <a href="#features" className="hover:text-slate-950 dark:hover:text-white">
              Features
            </a>
            <a href="#modules" className="hover:text-slate-950 dark:hover:text-white">
              Modules
            </a>
            <a href="#security" className="hover:text-slate-950 dark:hover:text-white">
              Security
            </a>
            <a href="#pricing" className="hover:text-slate-950 dark:hover:text-white">
              Pricing
            </a>
          </nav>
          <div className="flex items-center gap-2">
            <SecondaryButton href="/auth/login">Sign in</SecondaryButton>
            <PrimaryButton href="/auth/register">Request access</PrimaryButton>
          </div>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-6xl px-4 pt-14 pb-10">
          <div className="grid gap-10 md:grid-cols-2 md:items-center">
            <div className="space-y-6">
              <div className="flex flex-wrap items-center gap-2">
                <GradientPill>Enterprise-ready</GradientPill>
                <GradientPill>RBAC + Audit</GradientPill>
                <GradientPill>AI Recommendations</GradientPill>
              </div>
              <h1 className="text-balance text-4xl font-semibold tracking-tight text-slate-950 dark:text-white sm:text-5xl">
                Close skill gaps faster with AI-powered competency intelligence.
              </h1>
              <p className="max-w-xl text-pretty text-lg leading-7 text-slate-600 dark:text-slate-300">
                AI-CSGTS helps IT organizations measure competencies, identify gaps, predict future
                demand, and build targeted training plans—backed by secure workflows and
                compliance-ready audit trails.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row">
                <PrimaryButton href="/auth/register">Start with HR approval</PrimaryButton>
                <SecondaryButton href="/auth/login">Try demo sign-in</SecondaryButton>
              </div>
              <div className="flex flex-wrap gap-3 text-xs text-slate-600 dark:text-slate-300">
                <span className="rounded-lg border border-slate-200 bg-white/60 px-2 py-1 backdrop-blur dark:border-slate-800 dark:bg-slate-950/40">
                  Dashboards: Employee / Manager / HR / Admin
                </span>
                <span className="rounded-lg border border-slate-200 bg-white/60 px-2 py-1 backdrop-blur dark:border-slate-800 dark:bg-slate-950/40">
                  Exports: PDF / Excel / PowerPoint
                </span>
                <span className="rounded-lg border border-slate-200 bg-white/60 px-2 py-1 backdrop-blur dark:border-slate-800 dark:bg-slate-950/40">
                  SSO-ready architecture
                </span>
              </div>
            </div>

            <div className="relative">
              <div className="absolute inset-0 -z-10 rounded-3xl bg-gradient-to-br from-blue-600/15 via-cyan-500/10 to-sky-500/10 blur-2xl" />
              <div className="rounded-3xl border border-slate-200/70 bg-white/70 p-5 shadow-xl shadow-slate-900/5 backdrop-blur dark:border-slate-800/60 dark:bg-slate-950/40">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    Executive Overview
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-300">
                    Live • Last 24h
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  {[
                    { k: "Gap severity", v: "High", c: "text-red-600" },
                    { k: "Closure rate", v: "+12%", c: "text-emerald-600" },
                    { k: "Top demand", v: "Cloud", c: "text-blue-600" },
                    { k: "At risk", v: "Security", c: "text-amber-600" },
                  ].map((x) => (
                    <div
                      key={x.k}
                      className="rounded-2xl border border-slate-200 bg-white/70 p-4 dark:border-slate-800 dark:bg-slate-950/40"
                    >
                      <div className="text-xs text-slate-500 dark:text-slate-300">{x.k}</div>
                      <div className={`mt-1 text-lg font-semibold ${x.c}`}>{x.v}</div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 rounded-2xl border border-slate-200 bg-gradient-to-r from-blue-600/10 to-cyan-500/10 p-4 dark:border-slate-800">
                  <div className="text-xs font-medium text-slate-700 dark:text-slate-200">
                    AI recommendation
                  </div>
                  <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                    Prioritize Kubernetes + AppSec training for Platform teams to reduce delivery
                    risk by ~18%.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="mx-auto max-w-6xl px-4 py-10">
          <div className="flex items-end justify-between gap-6">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-blue-700 dark:text-blue-300">
                Capabilities
              </div>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 dark:text-white">
                Everything you need to run competency at scale
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
                Designed for enterprise operations: approvals, auditability, exports, and
                explainable AI—without sacrificing UX.
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div
                key={f.title}
                className="rounded-2xl border border-slate-200/70 bg-white/70 p-5 shadow-sm backdrop-blur transition hover:shadow-md dark:border-slate-800/60 dark:bg-slate-950/40"
              >
                <div className="text-sm font-semibold text-slate-950 dark:text-white">
                  {f.title}
                </div>
                <div className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                  {f.desc}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section id="modules" className="mx-auto max-w-6xl px-4 py-10">
          <div className="rounded-3xl border border-slate-200/70 bg-white/70 p-6 backdrop-blur dark:border-slate-800/60 dark:bg-slate-950/40">
            <h3 className="text-lg font-semibold text-slate-950 dark:text-white">
              Modules included
            </h3>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {[
                "User & Role Management",
                "Competency Profiles",
                "Skill Gap Analysis",
                "AI Analytics",
                "Training Recommendations",
                "Project Resource Allocation",
                "Reporting & Dashboards",
                "Audit & History",
                "Admin & Configuration",
              ].map((m) => (
                <div
                  key={m}
                  className="rounded-2xl border border-slate-200 bg-white/70 px-4 py-3 text-sm font-medium text-slate-800 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-200"
                >
                  {m}
                </div>
              ))}
            </div>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <PrimaryButton href="/auth/login">Open the app</PrimaryButton>
              <span className="text-xs text-slate-600 dark:text-slate-300">
                Demo sign-in lets you preview dashboards by role.
              </span>
            </div>
          </div>
        </section>

        <section id="security" className="mx-auto max-w-6xl px-4 py-10">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-3xl border border-slate-200/70 bg-white/70 p-6 backdrop-blur dark:border-slate-800/60 dark:bg-slate-950/40">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                Security
              </div>
              <h3 className="mt-2 text-lg font-semibold text-slate-950 dark:text-white">
                Secure by design, compliance-ready by default
              </h3>
              <ul className="mt-4 space-y-2 text-sm text-slate-600 dark:text-slate-300">
                <li>JWT-based auth with refresh/session tracking (API-ready)</li>
                <li>Role-based access control + permission matrix</li>
                <li>HR approval workflow for new users</li>
                <li>Immutable audit log trail and login history</li>
                <li>Tenant isolation model for SaaS scaling</li>
              </ul>
            </div>
            <div className="rounded-3xl border border-slate-200/70 bg-white/70 p-6 backdrop-blur dark:border-slate-800/60 dark:bg-slate-950/40">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                AI
              </div>
              <h3 className="mt-2 text-lg font-semibold text-slate-950 dark:text-white">
                Explainable recommendations
              </h3>
              <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
                Each AI recommendation includes confidence scores and top drivers (gap severity,
                recency, role targets, and training coverage).
              </p>
              <div className="mt-4 rounded-2xl border border-slate-200 bg-white/70 p-4 text-sm dark:border-slate-800 dark:bg-slate-950/40">
                <div className="font-semibold text-slate-900 dark:text-slate-100">
                  “Kubernetes for Developers”
                </div>
                <div className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                  Confidence 0.86 • Drivers: gap=-2 levels, high demand forecast, project need in
                  60 days
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="pricing" className="mx-auto max-w-6xl px-4 py-12">
          <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-blue-700 dark:text-blue-300">
                Pricing
              </div>
              <h3 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 dark:text-white">
                Simple plans for enterprise teams
              </h3>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
                This is a build-ready template. Plans below are placeholders for your SaaS
                packaging.
              </p>
            </div>
            <PrimaryButton href="/auth/register">Request access</PrimaryButton>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {[
              {
                name: "Team",
                price: "$6",
                note: "per user / month",
                items: ["Profiles", "Gap analysis", "Training tracking", "Exports"],
              },
              {
                name: "Business",
                price: "$12",
                note: "per user / month",
                items: ["AI recommendations", "Heatmaps", "Projects allocation", "Custom reports"],
                highlight: true,
              },
              {
                name: "Enterprise",
                price: "Custom",
                note: "annual",
                items: ["SSO/SAML", "Advanced audit", "Integrations", "Dedicated support"],
              },
            ].map((p) => (
              <div
                key={p.name}
                className={[
                  "rounded-3xl border bg-white/70 p-6 backdrop-blur dark:bg-slate-950/40",
                  p.highlight
                    ? "border-blue-300 shadow-xl shadow-blue-500/10 dark:border-blue-600/50"
                    : "border-slate-200/70 dark:border-slate-800/60",
                ].join(" ")}
              >
                <div className="flex items-baseline justify-between">
                  <div className="text-sm font-semibold text-slate-950 dark:text-white">
                    {p.name}
                  </div>
                  {p.highlight ? (
                    <span className="rounded-full bg-blue-600/10 px-2 py-1 text-xs font-semibold text-blue-700 dark:text-blue-300">
                      Most popular
                    </span>
                  ) : null}
                </div>
                <div className="mt-3 flex items-end gap-2">
                  <div className="text-3xl font-semibold text-slate-950 dark:text-white">
                    {p.price}
                  </div>
                  <div className="pb-1 text-xs text-slate-600 dark:text-slate-300">{p.note}</div>
                </div>
                <ul className="mt-4 space-y-2 text-sm text-slate-600 dark:text-slate-300">
                  {p.items.map((i) => (
                    <li key={i}>{i}</li>
                  ))}
                </ul>
                <div className="mt-5">
                  <SecondaryButton href="/auth/register">Get started</SecondaryButton>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200/60 bg-white/60 py-8 backdrop-blur dark:border-slate-800/60 dark:bg-slate-950/40">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 text-sm text-slate-600 dark:text-slate-300 md:flex-row md:items-center md:justify-between">
          <div>© {new Date().getFullYear()} AI-CSGTS. All rights reserved.</div>
          <div className="flex gap-4">
            <Link href="/auth/login" className="hover:text-slate-950 dark:hover:text-white">
              Sign in
            </Link>
            <Link href="/auth/register" className="hover:text-slate-950 dark:hover:text-white">
              Request access
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
