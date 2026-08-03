"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/components/ui/Toast";
import { CheckIcon, LinkIcon, TrashIcon } from "@/components/ui/icons";
import type { GoogleConnectionStatus } from "@/lib/googleAuth";

/** The one shared Google connection (Gmail/Drive/Sheets) — deliberately
 * lives only under /admin (AdminGuard-protected) so only admins can see or
 * use the connect/disconnect controls, not just the "admins only" message
 * inside a page anyone with Assistant access can open. */
export function GoogleConnectionCard() {
  const [googleStatus, setGoogleStatus] = useState<GoogleConnectionStatus | null>(null);
  const [disconnecting, setDisconnecting] = useState(false);
  const toast = useToast();

  useEffect(() => {
    fetch("/api/integrations/google/status")
      .then((res) => res.json())
      .then((data: GoogleConnectionStatus) => setGoogleStatus(data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const googleResult = params.get("google");
    if (!googleResult) return;
    if (googleResult === "connected") toast.success("Google account connected.");
    else if (googleResult === "error") toast.error(params.get("message") ?? "Failed to connect Google.");
    window.history.replaceState(null, "", window.location.pathname);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleDisconnectGoogle() {
    setDisconnecting(true);
    try {
      const res = await fetch("/api/integrations/google/disconnect", { method: "POST" });
      if (!res.ok) throw new Error();
      const data: GoogleConnectionStatus = await res.json();
      setGoogleStatus(data);
      toast.success("Google account disconnected.");
    } catch {
      toast.error("Failed to disconnect. Try again.");
    } finally {
      setDisconnecting(false);
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center gap-2">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-300">
          <LinkIcon className="h-4.5 w-4.5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-slate-800 dark:text-slate-100">Google (Gmail, Drive &amp; Sheets)</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Lets AI agents send email and read the inbox/Drive through one shared Google account, and powers the Google Sheet backup below.
          </p>
          {googleStatus && (
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {googleStatus.connected ? (
                <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                  <CheckIcon className="h-3 w-3" /> Connected as {googleStatus.email}
                </span>
              ) : (
                <span>Not connected — agents can&apos;t use Gmail/Drive, and Sheet backup is disabled, until this is connected.</span>
              )}
            </p>
          )}
        </div>
      </div>

      <div className="mt-4">
        {googleStatus?.connected ? (
          <button
            type="button"
            onClick={handleDisconnectGoogle}
            disabled={disconnecting}
            className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950"
          >
            <TrashIcon className="h-3.5 w-3.5" />
            {disconnecting ? "Disconnecting…" : "Disconnect"}
          </button>
        ) : (
          <a
            href="/api/integrations/google/connect"
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-500"
          >
            <LinkIcon className="h-3.5 w-3.5" />
            Connect Google account
          </a>
        )}
      </div>
    </div>
  );
}
