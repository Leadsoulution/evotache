"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { canManageUsers } from "@/config/roleMeta";
import { useToast } from "@/components/ui/Toast";
import { CheckIcon, LinkIcon, TrashIcon } from "@/components/ui/icons";

interface MetaStatus {
  connected: boolean;
  accountName: string | null;
  expiresAt: string | null;
}

export function MetaConnectionCard() {
  const { user } = useAuth();
  const isAdmin = user ? canManageUsers(user.role) : false;
  const [status, setStatus] = useState<MetaStatus | null>(null);
  const [disconnecting, setDisconnecting] = useState(false);
  const toast = useToast();

  useEffect(() => {
    if (!isAdmin) return;
    fetch("/api/integrations/meta/status")
      .then((res) => res.json())
      .then((data: MetaStatus) => setStatus(data))
      .catch(() => {});
  }, [isAdmin]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const result = params.get("meta");
    if (!result) return;
    if (result === "connected") toast.success("Meta account connected.");
    else if (result === "error") toast.error(params.get("message") ?? "Failed to connect Meta.");
    window.history.replaceState(null, "", window.location.pathname);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleDisconnect() {
    setDisconnecting(true);
    try {
      const res = await fetch("/api/integrations/meta/disconnect", { method: "POST" });
      if (!res.ok) throw new Error();
      setStatus(await res.json());
      toast.success("Meta account disconnected.");
    } catch {
      toast.error("Failed to disconnect. Try again.");
    } finally {
      setDisconnecting(false);
    }
  }

  if (!isAdmin || !status) return null;

  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-300">
        <LinkIcon className="h-4.5 w-4.5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-slate-800 dark:text-slate-100">Meta Ads (Facebook &amp; Instagram)</p>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {status.connected ? (
            <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
              <CheckIcon className="h-3 w-3" /> Connected as {status.accountName}
            </span>
          ) : (
            "Not connected — link a project to a Meta ad account to auto-sync its campaigns."
          )}
        </p>
      </div>
      {status.connected ? (
        <button
          type="button"
          onClick={handleDisconnect}
          disabled={disconnecting}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950"
        >
          <TrashIcon className="h-3.5 w-3.5" />
          {disconnecting ? "Disconnecting…" : "Disconnect"}
        </button>
      ) : (
        <a
          href="/api/integrations/meta/connect"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500"
        >
          <LinkIcon className="h-3.5 w-3.5" />
          Connect Meta account
        </a>
      )}
    </div>
  );
}
