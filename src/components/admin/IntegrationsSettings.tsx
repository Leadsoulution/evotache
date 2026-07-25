"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { canManageUsers } from "@/config/roleMeta";
import { useToast } from "@/components/ui/Toast";
import { AlertTriangleIcon, CheckIcon, KeyIcon, TrashIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";

interface KeyStatus {
  configured: boolean;
  source: "custom" | "env" | "none";
  maskedKey: string | null;
}

const inputClass =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-indigo-950";

export function IntegrationsSettings() {
  const { user } = useAuth();
  const isAdmin = user ? canManageUsers(user.role) : false;
  const [status, setStatus] = useState<KeyStatus | null>(null);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);
  const toast = useToast();

  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;
    fetch("/api/settings/openai-key")
      .then((res) => res.json())
      .then((data: KeyStatus) => {
        if (!cancelled) setStatus(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [isAdmin]);

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-slate-200 px-6 py-16 text-center dark:border-slate-800">
        <AlertTriangleIcon className="h-10 w-10 text-amber-400" />
        <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Admins only</p>
        <p className="text-sm text-slate-400">Only admins can view or change API key configuration.</p>
      </div>
    );
  }

  async function handleSave() {
    const apiKey = draft.trim();
    if (!apiKey) return;
    setSaving(true);
    try {
      const res = await fetch("/api/settings/openai-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey }),
      });
      if (!res.ok) throw new Error();
      const data: KeyStatus = await res.json();
      setStatus(data);
      setDraft("");
      toast.success("OpenAI API key saved.");
    } catch {
      toast.error("Failed to save the key. Try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove() {
    setRemoving(true);
    try {
      const res = await fetch("/api/settings/openai-key", { method: "DELETE" });
      if (!res.ok) throw new Error();
      const data: KeyStatus = await res.json();
      setStatus(data);
      toast.success("Saved key removed.");
    } catch {
      toast.error("Failed to remove the key. Try again.");
    } finally {
      setRemoving(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-slate-500 dark:text-slate-400">
        Configure the OpenAI key used by the AI Assistant (task/litige generation, analysis, and voice-to-text). Saved here on the server — it is never
        sent back to the browser.
      </p>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-300">
            <KeyIcon className="h-4.5 w-4.5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-slate-800 dark:text-slate-100">OpenAI API key</p>
            {status && (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {status.source === "custom" && (
                  <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                    <CheckIcon className="h-3 w-3" /> Configured ({status.maskedKey})
                  </span>
                )}
                {status.source === "env" && (
                  <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                    <CheckIcon className="h-3 w-3" /> Using environment variable ({status.maskedKey})
                  </span>
                )}
                {status.source === "none" && <span>Not configured — the AI Assistant is disabled until a key is added.</span>}
              </p>
            )}
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2">
          <input
            type="password"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="sk-..."
            autoComplete="off"
            spellCheck={false}
            className={cn(inputClass, "flex-1")}
          />
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !draft.trim()}
            className="shrink-0 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>

        {status?.source === "custom" && (
          <button
            type="button"
            onClick={handleRemove}
            disabled={removing}
            className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-red-600 hover:underline disabled:cursor-not-allowed disabled:opacity-60 dark:text-red-400"
          >
            <TrashIcon className="h-3.5 w-3.5" />
            {removing ? "Removing…" : "Remove saved key"}
          </button>
        )}
      </div>
    </div>
  );
}
