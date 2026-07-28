"use client";

import { useState } from "react";
import { useToast } from "@/components/ui/Toast";
import { CheckIcon, ChevronDownIcon, SheetIcon, TrashIcon } from "@/components/ui/icons";
import { APPS_SCRIPT_TEMPLATE } from "@/lib/appsScriptTemplate";
import type { ColumnMapping, GoogleSheetStatus } from "@/types/googleSheet";

const inputClass =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-indigo-950";

const MAPPING_FIELDS: { key: "name" | "reference" | "lastSaleDate" | "purchaseDate"; label: string; required: boolean }[] = [
  { key: "name", label: "Nom du produit", required: true },
  { key: "reference", label: "Référence / SKU (optionnel)", required: false },
  { key: "lastSaleDate", label: "Date de dernière vente", required: true },
  { key: "purchaseDate", label: "Date d'achat", required: true },
];

interface GoogleSheetSettingsPanelProps {
  status: GoogleSheetStatus;
  saveConnection: (webAppUrl: string, token: string) => Promise<boolean>;
  saveMapping: (columnMapping: ColumnMapping, productsPerDay: number) => Promise<boolean>;
  disconnect: () => Promise<void>;
}

/** Reads/writes the single `useGoogleSheetConfig()` instance owned by the parent (`ProductsToLaunchView`) — this component must never call the hook itself, or its writes won't be visible to the sibling product list, which has its own state snapshot. */
export function GoogleSheetSettingsPanel({ status, saveConnection, saveMapping, disconnect }: GoogleSheetSettingsPanelProps) {
  const toast = useToast();

  const [webAppUrl, setWebAppUrl] = useState("");
  const [token, setToken] = useState("");
  const [savingConnection, setSavingConnection] = useState(false);

  const [detecting, setDetecting] = useState(false);
  const [headers, setHeaders] = useState<string[] | null>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [productsPerDay, setProductsPerDay] = useState("20");
  const [savingMapping, setSavingMapping] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [lastStatus, setLastStatus] = useState<GoogleSheetStatus | null>(null);

  // Populate the form once, whenever a freshly-loaded (or freshly-saved)
  // status arrives — at render time, per React's guidance for resetting
  // state from a prop/value change, rather than in an effect.
  if (status !== lastStatus) {
    setLastStatus(status);
    if (status) {
      setWebAppUrl(status.webAppUrl ?? "");
      setProductsPerDay(String(status.productsPerDay));
      setMapping({
        name: status.columnMapping.name ?? "",
        reference: status.columnMapping.reference ?? "",
        lastSaleDate: status.columnMapping.lastSaleDate ?? "",
        purchaseDate: status.columnMapping.purchaseDate ?? "",
      });
    }
  }

  async function handleSaveConnection() {
    setSavingConnection(true);
    await saveConnection(webAppUrl, token);
    setSavingConnection(false);
  }

  async function handleDetectColumns() {
    setDetecting(true);
    try {
      const res = await fetch("/api/social/sheet-data");
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Impossible de lire le Sheet.");
      setHeaders(data.headers ?? []);
      if ((data.headers ?? []).length === 0) toast.error("Le Sheet semble vide.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Impossible de lire le Sheet.");
    } finally {
      setDetecting(false);
    }
  }

  async function handleSaveMapping() {
    if (!mapping.name || !mapping.lastSaleDate || !mapping.purchaseDate) {
      toast.error("Sélectionnez au moins le nom du produit, la date de dernière vente et la date d'achat.");
      return;
    }
    setSavingMapping(true);
    await saveMapping(
      { name: mapping.name, reference: mapping.reference || null, lastSaleDate: mapping.lastSaleDate, purchaseDate: mapping.purchaseDate },
      Number(productsPerDay) || 20
    );
    setSavingMapping(false);
  }

  const availableHeaders = headers ?? [];

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-300">
            <SheetIcon className="h-4.5 w-4.5" />
          </span>
          <div>
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Connexion Google Sheet</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {status.configured ? (
                <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                  <CheckIcon className="h-3 w-3" /> Connecté
                </span>
              ) : (
                "Non connecté"
              )}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowInstructions((v) => !v)}
          className="mt-3 flex items-center gap-1 text-xs font-medium text-indigo-600 hover:underline dark:text-indigo-400"
        >
          <ChevronDownIcon className={`h-3.5 w-3.5 transition-transform ${showInstructions ? "rotate-180" : ""}`} />
          {showInstructions ? "Masquer les instructions de configuration" : "Comment récupérer l'URL du Web App ?"}
        </button>
        {showInstructions && (
          <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300">
            <ol className="list-decimal space-y-1 pl-4">
              <li>Ouvrez votre Google Sheet, puis Extensions → Apps Script.</li>
              <li>Supprimez le code existant et collez le script ci-dessous.</li>
              <li>
                Changez <code className="rounded bg-slate-200 px-1 dark:bg-slate-700">SHEET_NAME</code> pour le nom exact de votre onglet.
              </li>
              <li>
                (Recommandé) Définissez un <code className="rounded bg-slate-200 px-1 dark:bg-slate-700">SECRET_TOKEN</code> et reportez-le
                ci-dessous dans le champ Token.
              </li>
              <li>
                Déployez : Déployer → Nouveau déploiement → Type &quot;Application Web&quot; → Exécuter en tant que: Moi → Accès: Tout le monde.
              </li>
              <li>Autorisez l&apos;accès quand Google le demande, puis copiez l&apos;URL de l&apos;application Web.</li>
              <li>Collez cette URL ci-dessous et cliquez sur Connecter.</li>
            </ol>
            <div className="mt-2 flex items-center justify-between gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Code à coller dans Apps Script</span>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(APPS_SCRIPT_TEMPLATE).then(() => toast.success("Script copié."));
                }}
                className="rounded-md border border-slate-200 px-2 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                Copier
              </button>
            </div>
            <pre className="mt-1 max-h-60 overflow-auto rounded-md bg-slate-900 p-2 text-[11px] text-slate-100">
              <code>{APPS_SCRIPT_TEMPLATE}</code>
            </pre>
          </div>
        )}

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <label className="block text-sm sm:col-span-2">
            <span className="mb-1 block font-medium text-slate-700 dark:text-slate-300">URL du Web App</span>
            <input
              value={webAppUrl}
              onChange={(event) => setWebAppUrl(event.target.value)}
              placeholder="https://script.google.com/macros/s/…/exec"
              spellCheck={false}
              className={inputClass}
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-slate-700 dark:text-slate-300">Token (optionnel)</span>
            <input value={token} onChange={(event) => setToken(event.target.value)} type="password" spellCheck={false} className={inputClass} />
          </label>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <button
            type="button"
            onClick={handleSaveConnection}
            disabled={savingConnection || !webAppUrl.trim()}
            className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {savingConnection ? "Connexion…" : "Connecter"}
          </button>
          {status.configured && (
            <button
              type="button"
              onClick={disconnect}
              className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
            >
              <TrashIcon className="h-3.5 w-3.5" />
              Déconnecter
            </button>
          )}
        </div>
      </div>

      {status.configured && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Correspondance des colonnes</p>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            Indiquez quelle colonne de votre Sheet correspond à chaque champ. Les produits sans date de vente récente remontent en premier.
          </p>

          <button
            type="button"
            onClick={handleDetectColumns}
            disabled={detecting}
            className="mt-3 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            {detecting ? "Lecture du Sheet…" : "Lire les colonnes du Sheet"}
          </button>

          {availableHeaders.length > 0 && (
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {MAPPING_FIELDS.map((field) => (
                <label key={field.key} className="block text-sm">
                  <span className="mb-1 block font-medium text-slate-700 dark:text-slate-300">
                    {field.label}
                    {field.required && <span className="text-red-500"> *</span>}
                  </span>
                  <select
                    value={mapping[field.key] ?? ""}
                    onChange={(event) => setMapping((m) => ({ ...m, [field.key]: event.target.value }))}
                    className={inputClass}
                  >
                    <option value="">— Choisir une colonne —</option>
                    {availableHeaders.map((header) => (
                      <option key={header} value={header}>
                        {header}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
          )}

          <label className="mt-3 block max-w-[220px] text-sm">
            <span className="mb-1 block font-medium text-slate-700 dark:text-slate-300">Produits par jour (par défaut)</span>
            <input type="number" min="1" value={productsPerDay} onChange={(event) => setProductsPerDay(event.target.value)} className={inputClass} />
          </label>

          <button
            type="button"
            onClick={handleSaveMapping}
            disabled={savingMapping}
            className="mt-3 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {savingMapping ? "Enregistrement…" : "Enregistrer la correspondance"}
          </button>
        </div>
      )}
    </div>
  );
}
