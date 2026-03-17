"use client";

import Link from "next/link";
import { useState } from "react";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/demo-register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, fullName }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error || "Registration failed");
      }
      window.location.href = "/auth/pending";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-grid px-4 py-10">
      <div className="mx-auto max-w-md">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
          <span className="h-8 w-8 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 shadow-lg shadow-blue-500/15" />
          <span className="font-semibold">AI-CSGTS</span>
        </Link>

        <div className="mt-6 rounded-3xl border border-slate-200/70 bg-white/70 p-6 shadow-xl shadow-slate-900/5 backdrop-blur dark:border-slate-800/60 dark:bg-slate-950/40">
          <h1 className="text-xl font-semibold tracking-tight text-slate-950 dark:text-white">
            Request access
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            New users enter <span className="font-semibold">HR approval</span> before activation.
          </p>

          <form className="mt-5 space-y-4" onSubmit={onSubmit}>
            <div>
              <label className="text-xs font-medium text-slate-700 dark:text-slate-200">Full name</label>
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white/70 px-3 py-2 text-sm outline-none ring-blue-400/40 focus:ring-2 dark:border-slate-800 dark:bg-slate-950/40"
                placeholder="Jane Doe"
                autoComplete="name"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-slate-700 dark:text-slate-200">Email</label>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white/70 px-3 py-2 text-sm outline-none ring-blue-400/40 focus:ring-2 dark:border-slate-800 dark:bg-slate-950/40"
                placeholder="name@company.com"
                autoComplete="email"
              />
            </div>

            {error ? (
              <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200">
                {error}
              </div>
            ) : null}

            <button
              disabled={loading}
              className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/15 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Submitting…" : "Submit request"}
            </button>
          </form>

          <div className="mt-5 text-sm text-slate-600 dark:text-slate-300">
            Already have access?{" "}
            <Link className="font-semibold text-blue-700 hover:underline dark:text-blue-300" href="/auth/login">
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

