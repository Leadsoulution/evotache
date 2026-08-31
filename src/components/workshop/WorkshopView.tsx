"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import { useAuth } from "@/hooks/useAuth";
import { useWorkshopRepairs } from "@/hooks/useWorkshopRepairs";
import { useTvCast } from "@/hooks/useTvCast";
import { fetchUsers } from "@/services/userApi";
import { canCreateWorkshopRepairs, canDeleteWorkshopRepairs, canEditWorkshopStatus } from "@/config/roleMeta";
import { WorkshopMechanicCard } from "./WorkshopMechanicCard";
import { WorkshopBoard } from "./WorkshopBoard";
import { WorkshopRepairDialog } from "./WorkshopRepairDialog";
import { WorkshopDetailDrawer } from "./WorkshopDetailDrawer";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { TaskListSkeleton } from "@/components/task-list/TaskListSkeleton";
import { useToast } from "@/components/ui/Toast";
import { CastIcon, PlusIcon, TvIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import { WORKSHOP_STATUS_LABEL, WORKSHOP_STATUS_ORDER } from "@/lib/workshopStats";
import type { AppUser } from "@/types/user";
import type { WorkshopRepair, WorkshopService, WorkshopStatus } from "@/types/workshop";

type Tab = "mine" | "board";

export function WorkshopView() {
  const { user } = useAuth();
  const toast = useToast();
  const { isCasting, startCasting, stopCasting } = useTvCast();
  const { data: usersData } = useSWR<AppUser[]>(user ? "users" : null, fetchUsers);
  const mechanics = useMemo(
    () => (usersData ?? []).filter((u) => u.status === "active" && !u.isAgent).map((u) => ({ id: u.id, name: u.name, color: u.color, photoDataUrl: u.photoDataUrl })),
    [usersData]
  );

  const { repairs, loadState, createRepair, updateRepair, deleteRepair, createService, updateService, deleteService, runServiceSessionAction } = useWorkshopRepairs();

  // Checking a prestation off (like any other checklist in the app) also
  // banks whatever chrono is still running on it, so a done job never
  // leaves a dangling session with no totalWorkSeconds.
  const toggleServiceDone = (service: WorkshopService, done: boolean) => {
    if (done && service.activeSession && !service.activeSession.endedAt) {
      runServiceSessionAction(service.id, "end");
    }
    updateService(service.id, { status: done ? "done" : "waiting" });
  };

  const myRepairs = useMemo(
    () => repairs.filter((r) => r.mechanicId === user?.id && r.status !== "picked_up" && r.status !== "cancelled"),
    [repairs, user?.id]
  );
  const [tab, setTab] = useState<Tab>("mine");

  const [search, setSearch] = useState("");
  const [mechanicFilter, setMechanicFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [creating, setCreating] = useState(false);
  const [detailRepair, setDetailRepair] = useState<WorkshopRepair | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const filteredRepairs = useMemo(() => {
    const query = search.trim().toLowerCase();
    return repairs.filter((r) => {
      if (mechanicFilter && r.mechanicId !== mechanicFilter) return false;
      if (statusFilter && r.status !== statusFilter) return false;
      if (query && !`${r.brand} ${r.model} ${r.orderNumber}`.toLowerCase().includes(query)) return false;
      return true;
    });
  }, [repairs, search, mechanicFilter, statusFilter]);

  const canCreate = user ? canCreateWorkshopRepairs(user.role) : false;
  const canEditStatus = user ? canEditWorkshopStatus(user.role) : false;
  const canEditRepair = canCreate; // same role set — see roleMeta.ts comment on canCreateWorkshopRepairs reuse
  const canDelete = user ? canDeleteWorkshopRepairs(user.role) : false;

  // Selected repair for the drawer needs to stay in sync with the polled
  // list (chrono/status can change from another session), not freeze at
  // whatever it looked like the moment it was opened.
  const openRepair = detailRepair ? (repairs.find((r) => r.id === detailRepair.id) ?? detailRepair) : null;

  async function handleCastClick() {
    if (isCasting) {
      stopCasting();
      toast.info("Diffusion arrêtée.");
      return;
    }
    const result = await startCasting(`${window.location.origin}/atelier/tv`);
    if (result.ok) {
      toast.success("Diffusion démarrée sur la TV sélectionnée.");
    } else if (result.reason === "unsupported") {
      toast.info('Votre navigateur ne permet pas de rechercher une TV disponible. Utilisez le bouton "Caster" de Chrome, ou ouvrez "Écran TV" sur un appareil déjà connecté à la TV.');
    }
    // "cancelled" (device picker closed with no selection) — nothing to say.
  }

  if (!user) return null;

  return (
    <div className="mx-auto flex w-full max-w-[95%] flex-col gap-4 px-4 py-8 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">Atelier</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Suivi des motos en réparation.</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <a
            href="/atelier/tv"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <TvIcon className="h-4 w-4" />
            Écran TV
          </a>
          <button
            type="button"
            onClick={handleCastClick}
            title="Rechercher une TV disponible sur le réseau et y diffuser l'écran"
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium",
              isCasting
                ? "border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:border-indigo-900 dark:bg-indigo-950 dark:text-indigo-300"
                : "border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            )}
          >
            <CastIcon className="h-4 w-4" />
            {isCasting ? "Diffusion en cours…" : "Diffuser sur une TV"}
          </button>
          {canCreate && (
            <button
              type="button"
              onClick={() => setCreating(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-indigo-500"
            >
              <PlusIcon className="h-4 w-4" />
              Ajouter à l&apos;atelier
            </button>
          )}
        </div>
      </header>

      <div className="flex items-center gap-1 border-b border-slate-200 dark:border-slate-800">
        <button
          type="button"
          onClick={() => setTab("mine")}
          className={cn(
            "px-3 py-2 text-sm font-medium",
            tab === "mine" ? "border-b-2 border-indigo-500 text-indigo-600 dark:text-indigo-400" : "text-slate-500 hover:text-slate-700 dark:text-slate-400"
          )}
        >
          Mes réparations {myRepairs.length > 0 && `(${myRepairs.length})`}
        </button>
        <button
          type="button"
          onClick={() => setTab("board")}
          className={cn(
            "px-3 py-2 text-sm font-medium",
            tab === "board" ? "border-b-2 border-indigo-500 text-indigo-600 dark:text-indigo-400" : "text-slate-500 hover:text-slate-700 dark:text-slate-400"
          )}
        >
          Atelier Board
        </button>
      </div>

      {loadState === "loading" && <TaskListSkeleton />}

      {loadState === "success" && tab === "mine" && (
        <div>
          {myRepairs.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-200 py-10 text-center text-sm text-slate-400 dark:border-slate-700">
              Aucune moto ne vous est affectée pour l&apos;instant.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {myRepairs.map((repair) => (
                <WorkshopMechanicCard
                  key={repair.id}
                  repair={repair}
                  onSessionAction={runServiceSessionAction}
                  onToggleServiceDone={canEditStatus ? toggleServiceDone : undefined}
                  onOpenDetail={setDetailRepair}
                  onDeleteService={canEditRepair ? deleteService : undefined}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {loadState === "success" && tab === "board" && (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher (marque, modèle, N° BC)…"
              className="w-56 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-indigo-950"
            />
            <select
              value={mechanicFilter}
              onChange={(e) => setMechanicFilter(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            >
              <option value="">Tous les mécaniciens</option>
              {mechanics.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            >
              <option value="">Tous les statuts</option>
              {WORKSHOP_STATUS_ORDER.map((s: WorkshopStatus) => (
                <option key={s} value={s}>
                  {WORKSHOP_STATUS_LABEL[s]}
                </option>
              ))}
            </select>
          </div>
          <WorkshopBoard repairs={filteredRepairs} mechanics={mechanics} onOpenDetail={setDetailRepair} />
        </div>
      )}

      <WorkshopRepairDialog
        open={creating}
        mechanics={mechanics}
        onClose={() => setCreating(false)}
        onSubmit={async (draft) => {
          const created = await createRepair(draft);
          return Boolean(created);
        }}
      />

      <WorkshopDetailDrawer
        repair={openRepair}
        mechanics={mechanics}
        canEditStatus={canEditStatus}
        canEditRepair={canEditRepair}
        canDelete={canDelete}
        onClose={() => setDetailRepair(null)}
        onUpdate={updateRepair}
        onDelete={(id) => setPendingDeleteId(id)}
        onSessionAction={runServiceSessionAction}
        onToggleServiceDone={toggleServiceDone}
        onAddService={(repairId, description, scheduledDate) => createService(repairId, description, scheduledDate)}
        onDeleteService={deleteService}
      />

      <ConfirmDialog
        open={pendingDeleteId !== null}
        title="Supprimer cette réparation ?"
        description="Cette action est définitive et supprime aussi son historique et son chrono."
        confirmLabel="Supprimer"
        destructive
        onConfirm={async () => {
          if (pendingDeleteId) {
            await deleteRepair(pendingDeleteId);
            setDetailRepair(null);
          }
          setPendingDeleteId(null);
        }}
        onCancel={() => setPendingDeleteId(null)}
      />
    </div>
  );
}
