"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useUsers } from "@/hooks/useUsers";
import { useStories } from "@/hooks/useStories";
import { useGoogleSheetConfig } from "@/hooks/useGoogleSheetConfig";
import { useSheetProducts } from "@/hooks/useSheetProducts";
import { canManageWorkflow } from "@/config/roleMeta";
import { GoogleSheetSettingsPanel } from "./GoogleSheetSettingsPanel";
import { StoryDialog } from "./StoryDialog";
import { TaskListSkeleton } from "@/components/task-list/TaskListSkeleton";
import { AlertTriangleIcon, RefreshIcon, SheetIcon, SparklesIcon } from "@/components/ui/icons";
import { formatDueDate } from "@/lib/date";
import type { GoogleSheetStatus, RankedProduct } from "@/types/googleSheet";

function daysLabel(days: number | null): string {
  if (days === null) return "Jamais";
  if (days === 0) return "Aujourd'hui";
  return `${days} j`;
}

export function ProductsToLaunchView() {
  const { user } = useAuth();
  const canManage = user ? canManageWorkflow(user.role) : false;
  const { users } = useUsers();
  const { addStory } = useStories();
  const { status, saveConnection, saveMapping, disconnect } = useGoogleSheetConfig();

  const mappingReady = Boolean(status?.configured && status.columnMapping.name && status.columnMapping.lastSaleDate && status.columnMapping.purchaseDate);
  const { rankedProducts, loadState, errorMessage, lastSyncedAt, refetch } = useSheetProducts(mappingReady ? (status?.columnMapping ?? null) : null, mappingReady);

  const [manualShowSettings, setManualShowSettings] = useState<boolean | null>(null);
  const [quotaInput, setQuotaInput] = useState("20");
  const [appliedQuota, setAppliedQuota] = useState<number | null>(null);
  const [launchingProduct, setLaunchingProduct] = useState<RankedProduct | null>(null);
  const [lastStatus, setLastStatus] = useState<GoogleSheetStatus | null>(null);

  // Prefill the quota once, whenever a freshly-loaded status arrives — at
  // render time (see other dialogs in this codebase for the same pattern),
  // not in an effect.
  if (status !== lastStatus) {
    setLastStatus(status);
    if (status) {
      setQuotaInput(String(status.productsPerDay));
      setAppliedQuota(status.productsPerDay);
    }
  }

  if (!status) return null;

  // Defaults to showing the settings panel until the sheet is fully wired
  // up, but the admin's own toggle click always wins once they've used it.
  const showSettings = manualShowSettings ?? (!status.configured || !mappingReady);
  const visibleProducts = appliedQuota ? rankedProducts.slice(0, appliedQuota) : rankedProducts;

  return (
    <div className="flex flex-col gap-4">
      {!status.configured && !canManage && (
        <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-200 bg-white px-6 py-16 text-center dark:border-slate-800 dark:bg-slate-900">
          <SheetIcon className="h-10 w-10 text-slate-300 dark:text-slate-700" />
          <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Google Sheet non connecté</p>
          <p className="text-xs text-slate-400">Demandez à un administrateur de connecter le Sheet des produits.</p>
        </div>
      )}

      {canManage && (
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Produits à lancer (stock mort)</p>
          <button
            type="button"
            onClick={() => setManualShowSettings(!showSettings)}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            {showSettings ? "Masquer les réglages" : "Réglages du Sheet"}
          </button>
        </div>
      )}

      {canManage && showSettings && (
        <GoogleSheetSettingsPanel status={status} saveConnection={saveConnection} saveMapping={saveMapping} disconnect={disconnect} />
      )}

      {status.configured && mappingReady && (!canManage || !showSettings) && (
        <>
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <label className="flex items-center gap-2 text-sm">
              <span className="font-medium text-slate-700 dark:text-slate-300">Produits par jour</span>
              <input
                type="number"
                min="1"
                value={quotaInput}
                onChange={(event) => setQuotaInput(event.target.value)}
                className="w-20 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-900 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              />
            </label>
            <button
              type="button"
              onClick={() => setAppliedQuota(Number(quotaInput) > 0 ? Number(quotaInput) : null)}
              className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500"
            >
              Filtrer
            </button>
            <button
              type="button"
              onClick={() => setAppliedQuota(null)}
              className="text-xs font-medium text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400"
            >
              Tout afficher
            </button>
            <div className="ml-auto flex items-center gap-3 text-xs text-slate-400">
              <span>{rankedProducts.length.toLocaleString()} produits chargés</span>
              {lastSyncedAt && <span>Synchronisé à {lastSyncedAt.toLocaleTimeString()}</span>}
              <button
                type="button"
                onClick={refetch}
                disabled={loadState === "loading"}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <RefreshIcon className={`h-3 w-3 ${loadState === "loading" ? "animate-spin" : ""}`} />
                Synchroniser
              </button>
            </div>
          </div>

          {loadState === "loading" && rankedProducts.length === 0 && <TaskListSkeleton />}

          {loadState === "error" && (
            <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
              <AlertTriangleIcon className="h-4 w-4 shrink-0" />
              {errorMessage}
            </div>
          )}

          {visibleProducts.length > 0 && (
            <div className="min-w-0 overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <table className="w-full min-w-[820px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:text-slate-400">
                    <th scope="col" className="px-3 py-2">
                      #
                    </th>
                    <th scope="col" className="px-3 py-2">
                      Produit
                    </th>
                    <th scope="col" className="px-3 py-2">
                      Référence
                    </th>
                    <th scope="col" className="whitespace-nowrap px-3 py-2">
                      Dernière vente
                    </th>
                    <th scope="col" className="whitespace-nowrap px-3 py-2">
                      Sans vente depuis
                    </th>
                    <th scope="col" className="whitespace-nowrap px-3 py-2">
                      Date d&apos;achat
                    </th>
                    <th scope="col" className="px-3 py-2" aria-hidden="true" />
                  </tr>
                </thead>
                <tbody>
                  {visibleProducts.map((product, index) => (
                    <tr key={product.id} className="group border-b border-slate-100 last:border-0 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50">
                      <td className="px-3 py-2 text-slate-400">{index + 1}</td>
                      <td className="max-w-[260px] truncate px-3 py-2 font-medium text-slate-800 dark:text-slate-100">{product.name}</td>
                      <td className="px-3 py-2 text-slate-500 dark:text-slate-400">{product.reference ?? "—"}</td>
                      <td className="whitespace-nowrap px-3 py-2 text-slate-600 dark:text-slate-300">
                        {product.lastSaleDate ? formatDueDate(product.lastSaleDate) : "—"}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 font-semibold text-red-500">{daysLabel(product.daysSinceLastSale ?? product.stalenessDays)}</td>
                      <td className="whitespace-nowrap px-3 py-2 text-slate-600 dark:text-slate-300">
                        {product.purchaseDate ? formatDueDate(product.purchaseDate) : "—"}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <button
                          type="button"
                          onClick={() => setLaunchingProduct(product)}
                          className="inline-flex items-center gap-1 rounded-lg border border-indigo-200 px-2.5 py-1 text-xs font-medium text-indigo-600 opacity-0 hover:bg-indigo-50 group-hover:opacity-100 dark:border-indigo-800 dark:text-indigo-300 dark:hover:bg-indigo-950"
                        >
                          <SparklesIcon className="h-3 w-3" />
                          Lancer
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {loadState === "success" && rankedProducts.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-200 bg-white px-6 py-16 text-center dark:border-slate-800 dark:bg-slate-900">
              <SheetIcon className="h-10 w-10 text-slate-300 dark:text-slate-700" />
              <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Aucun produit trouvé dans le Sheet</p>
            </div>
          )}
        </>
      )}

      <StoryDialog
        open={launchingProduct !== null}
        story={null}
        defaultStatus="draft"
        initialTitle={launchingProduct ? `Story — ${launchingProduct.name}` : undefined}
        initialNotes={launchingProduct?.reference ? `Réf. ${launchingProduct.reference}` : undefined}
        users={users}
        onClose={() => setLaunchingProduct(null)}
        onSubmit={(input) => addStory(input)}
      />
    </div>
  );
}
