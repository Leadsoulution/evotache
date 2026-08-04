"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/components/ui/Toast";
import { CheckIcon, SendIcon } from "@/components/ui/icons";

interface TelegramSetupStatus {
  tokenConfigured: boolean;
  botUsername: string | null;
  webhookRegistered: boolean;
  error: string | null;
}

export function TelegramBotStatusCard() {
  const [status, setStatus] = useState<TelegramSetupStatus | null>(null);
  const [registering, setRegistering] = useState(false);
  const toast = useToast();

  useEffect(() => {
    fetch("/api/integrations/telegram/setup")
      .then((res) => res.json())
      .then((data: TelegramSetupStatus) => setStatus(data))
      .catch(() => {});
  }, []);

  async function handleRegisterWebhook() {
    setRegistering(true);
    try {
      const res = await fetch("/api/integrations/telegram/setup", { method: "POST" });
      const data: TelegramSetupStatus & { error?: string } = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to register the webhook.");
      setStatus(data);
      toast.success("Telegram webhook registered.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to register the webhook.");
    } finally {
      setRegistering(false);
    }
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center gap-2">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-300">
          <SendIcon className="h-4.5 w-4.5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-slate-800 dark:text-slate-100">Telegram bot</p>
          {!status ? (
            <p className="text-xs text-slate-400">Loading…</p>
          ) : !status.tokenConfigured ? (
            <p className="text-xs text-slate-500 dark:text-slate-400">TELEGRAM_BOT_TOKEN isn&apos;t configured on the server yet.</p>
          ) : status.error ? (
            <p className="text-xs text-red-600 dark:text-red-400">{status.error}</p>
          ) : status.webhookRegistered ? (
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                <CheckIcon className="h-3 w-3" /> @{status.botUsername} — webhook registered
              </span>
            </p>
          ) : (
            <p className="text-xs text-slate-500 dark:text-slate-400">@{status.botUsername} — webhook not registered yet.</p>
          )}
        </div>
        {status?.tokenConfigured && (
          <button
            type="button"
            onClick={handleRegisterWebhook}
            disabled={registering}
            className="shrink-0 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            {registering ? "…" : status.webhookRegistered ? "Re-register webhook" : "Register webhook"}
          </button>
        )}
      </div>
    </section>
  );
}
