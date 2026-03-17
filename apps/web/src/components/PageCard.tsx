"use client";

export function PageCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-slate-200/70 bg-white/70 p-6 shadow-sm backdrop-blur dark:border-slate-800/60 dark:bg-slate-950/40">
      <div className="flex items-end justify-between gap-6">
        <div>
          <div className="text-lg font-semibold tracking-tight text-slate-950 dark:text-white">
            {title}
          </div>
          {subtitle ? (
            <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">{subtitle}</div>
          ) : null}
        </div>
      </div>
      {children ? <div className="mt-5">{children}</div> : null}
    </div>
  );
}

