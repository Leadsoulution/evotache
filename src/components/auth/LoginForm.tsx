"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { AlertTriangleIcon } from "@/components/ui/icons";

const DEMO_ACCOUNTS = [
  { email: "elmahdi@evotasks.com", password: "admin123", role: "Admin" },
  { email: "amine@evotasks.com", password: "admin123", role: "Admin" },
  { email: "mouad@evotasks.com", password: "member123", role: "Member" },
  { email: "yassine@evotasks.com", password: "member123", role: "Member" },
  { email: "rabie@evotasks.com", password: "limited123", role: "Limited member" },
  { email: "moha@evotasks.com", password: "limited123", role: "Limited member" },
  { email: "reda@evotasks.com", password: "viewer123", role: "Viewer" },
];

const inputClass =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-indigo-950";

export function LoginForm() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await login(email, password);
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to sign in.");
    } finally {
      setSubmitting(false);
    }
  }

  function fillDemo(account: (typeof DEMO_ACCOUNTS)[number]) {
    setEmail(account.email);
    setPassword(account.password);
    setError(null);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 dark:bg-slate-950">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-dark.png" alt="EvoTask" className="mx-auto h-28 w-auto dark:hidden" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-light.png" alt="EvoTask" className="mx-auto hidden h-28 w-auto dark:block" />
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Sign in to manage your tasks.</p>
        </div>

        <form onSubmit={handleSubmit} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          {error && (
            <div
              role="alert"
              className="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
            >
              <AlertTriangleIcon className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <label className="mb-3 block text-sm">
            <span className="mb-1 block font-medium text-slate-700 dark:text-slate-300">Email</span>
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="email" className={inputClass} />
          </label>

          <label className="mb-4 block text-sm">
            <span className="mb-1 block font-medium text-slate-700 dark:text-slate-300">Password</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              autoComplete="current-password"
              className={inputClass}
            />
          </label>

          <button
            type="submit"
            disabled={submitting}
            className="flex w-full items-center justify-center rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <div className="mt-4 rounded-xl border border-dashed border-slate-200 bg-white/60 p-4 text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-400">
          <p className="mb-2 font-medium text-slate-600 dark:text-slate-300">Demo accounts (mock auth, not for production)</p>
          <ul className="space-y-1.5">
            {DEMO_ACCOUNTS.map((account) => (
              <li key={account.email} className="flex items-center justify-between gap-2">
                <span>
                  <span className="font-medium text-slate-600 dark:text-slate-300">{account.role}</span> — {account.email} / {account.password}
                </span>
                <button
                  type="button"
                  onClick={() => fillDemo(account)}
                  className="shrink-0 rounded-md border border-slate-200 px-2 py-0.5 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Use
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
