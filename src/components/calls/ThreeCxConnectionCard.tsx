"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/components/ui/Toast";
import { CheckIcon, PhoneIcon, TrashIcon } from "@/components/ui/icons";

interface ThreeCxStatus {
  connected: boolean;
  pbxUrl: string | null;
  username: string | null;
}

const inputClass =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-indigo-950";

export function ThreeCxConnectionCard() {
  const [status, setStatus] = useState<ThreeCxStatus | null>(null);
  const [pbxUrl, setPbxUrl] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const toast = useToast();

  useEffect(() => {
    fetch("/api/integrations/threecx")
      .then((res) => res.json())
      .then((data: ThreeCxStatus) => setStatus(data))
      .catch(() => {});
  }, []);

  async function handleConnect() {
    if (!pbxUrl.trim() || !username.trim() || !password) return;
    setConnecting(true);
    try {
      const res = await fetch("/api/integrations/threecx", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pbxUrl, username, password }),
      });
      const data = (await res.json()) as ThreeCxStatus & { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed to connect to 3CX.");
      setStatus(data);
      setPbxUrl("");
      setUsername("");
      setPassword("");
      toast.success("3CX connecté.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to connect to 3CX.");
    } finally {
      setConnecting(false);
    }
  }

  async function handleDisconnect() {
    setDisconnecting(true);
    try {
      const res = await fetch("/api/integrations/threecx", { method: "DELETE" });
      const data: ThreeCxStatus = await res.json();
      setStatus(data);
      toast.success("3CX déconnecté.");
    } catch {
      toast.error("Échec de la déconnexion.");
    } finally {
      setDisconnecting(false);
    }
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center gap-2">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-300">
          <PhoneIcon className="h-4.5 w-4.5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-slate-800 dark:text-slate-100">Connexion 3CX</p>
          {status?.connected && (
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                <CheckIcon className="h-3 w-3" /> {status.pbxUrl} ({status.username})
              </span>
            </p>
          )}
        </div>
        {status?.connected && (
          <button
            type="button"
            onClick={handleDisconnect}
            disabled={disconnecting}
            className="shrink-0 inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950"
          >
            <TrashIcon className="h-3.5 w-3.5" />
            {disconnecting ? "…" : "Déconnecter"}
          </button>
        )}
      </div>

      {status && !status.connected && (
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
          <input value={pbxUrl} onChange={(event) => setPbxUrl(event.target.value)} placeholder="https://votrepbx.3cx.ma" className={inputClass} />
          <input value={username} onChange={(event) => setUsername(event.target.value)} placeholder="Nom d'utilisateur 3CX" className={inputClass} />
          <div className="flex items-center gap-2">
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Mot de passe"
              autoComplete="off"
              className={inputClass}
            />
            <button
              type="button"
              onClick={handleConnect}
              disabled={connecting || !pbxUrl.trim() || !username.trim() || !password}
              className="shrink-0 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {connecting ? "…" : "Connecter"}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
