"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useCalls } from "@/hooks/useCalls";
import { usePagination } from "@/hooks/usePagination";
import { canManageUsers, canManageWorkflow } from "@/config/roleMeta";
import { FilterMenu } from "@/components/ui/FilterMenu";
import { Pagination } from "@/components/ui/Pagination";
import { StatTile } from "@/components/stats/StatTile";
import { TaskListSkeleton } from "@/components/task-list/TaskListSkeleton";
import { formatDueDate } from "@/lib/date";
import { cn } from "@/lib/cn";
import { CheckIcon, ClockIcon, PhoneIcon, PhoneMissedIcon, SearchIcon } from "@/components/ui/icons";
import type { PhoneCall } from "@/types/call";

const CALL_TYPE_OPTIONS = [
  { value: "Inbound", label: "Entrant" },
  { value: "Outbound", label: "Sortant" },
  { value: "Missed", label: "Manqué" },
  { value: "Unanswered", label: "Non abouti" },
];

const CALL_TYPE_BADGE: Record<string, string> = {
  Inbound: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  Outbound: "bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300",
  Missed: "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300",
  Unanswered: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
};

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function CallsView() {
  const { user } = useAuth();
  const router = useRouter();
  const allowed = user ? canManageUsers(user.role) || canManageWorkflow(user.role) : false;
  const { calls, loading } = useCalls();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string[]>([]);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [pageSize, setPageSize] = useState<number | "all">(20);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return calls.filter((c) => {
      if (query && !c.contactNumber.toLowerCase().includes(query) && !c.agentExtension.toLowerCase().includes(query)) return false;
      if (typeFilter.length && !typeFilter.includes(c.callType)) return false;
      if (dateFrom && c.startTime < dateFrom) return false;
      if (dateTo && c.startTime > `${dateTo}T23:59:59`) return false;
      return true;
    });
  }, [calls, search, typeFilter, dateFrom, dateTo]);

  const kpis = useMemo(() => {
    const answered = calls.filter((c) => c.callType === "Inbound" || c.callType === "Outbound");
    const missed = calls.filter((c) => c.callType === "Missed");
    const avgDuration = answered.length ? Math.round(answered.reduce((sum, c) => sum + c.duration, 0) / answered.length) : 0;
    return { total: calls.length, answered: answered.length, missed: missed.length, avgDuration };
  }, [calls]);

  const { page, setPage, pageCount, start, end } = usePagination(filtered.length, pageSize);
  const paged = filtered.slice(start, end);

  useEffect(() => {
    if (user && !allowed) router.replace("/");
  }, [user, allowed, router]);

  if (!allowed) return null;

  return (
    <div className="mx-auto flex w-full max-w-[95%] flex-col gap-4 px-4 py-8 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">Appels</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Historique des appels synchronisés depuis 3CX.</p>
      </header>

      {loading && <TaskListSkeleton />}

      {!loading && (
        <>
          <section className="sticky top-0 z-10 grid grid-cols-2 gap-3 bg-slate-50 py-2 sm:grid-cols-4 dark:bg-slate-950">
            <StatTile label="Total appels" value={kpis.total} icon={<PhoneIcon className="h-4.5 w-4.5" />} />
            <StatTile label="Répondus" value={kpis.answered} icon={<CheckIcon className="h-4.5 w-4.5" />} />
            <StatTile label="Manqués" value={kpis.missed} icon={<PhoneMissedIcon className="h-4.5 w-4.5" />} tone={kpis.missed > 0 ? "warning" : "default"} />
            <StatTile label="Durée moyenne" value={formatDuration(kpis.avgDuration)} icon={<ClockIcon className="h-4.5 w-4.5" />} />
          </section>

          <div className="flex flex-wrap items-center gap-2">
            <label className="relative">
              <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Rechercher un numéro ou un agent…"
                className="w-64 rounded-lg border border-slate-200 bg-white py-1.5 pl-8 pr-2.5 text-sm text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:focus:ring-indigo-950"
              />
            </label>
            <FilterMenu label="Type" count={typeFilter.length} options={CALL_TYPE_OPTIONS} value={typeFilter} onChange={setTypeFilter} />
            <label className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
              Après
              <input
                type="date"
                value={dateFrom}
                onChange={(event) => setDateFrom(event.target.value)}
                className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700 outline-none focus:border-indigo-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              />
            </label>
            <label className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
              Avant
              <input
                type="date"
                value={dateTo}
                onChange={(event) => setDateTo(event.target.value)}
                className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700 outline-none focus:border-indigo-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              />
            </label>
          </div>

          {filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-slate-200 bg-white px-6 py-16 text-center dark:border-slate-800 dark:bg-slate-900">
              <PhoneIcon className="h-10 w-10 text-slate-300 dark:text-slate-700" />
              <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                {calls.length === 0 ? "Aucun appel synchronisé pour l'instant." : "Aucun appel ne correspond aux filtres."}
              </p>
            </div>
          )}

          {filtered.length > 0 && (
            <div className="min-w-0 overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <table className="w-full min-w-[720px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:text-slate-400">
                    {["Numéro", "Agent", "Type", "Date", "Durée"].map((header) => (
                      <th key={header} scope="col" className="whitespace-nowrap px-3 py-2">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paged.map((call: PhoneCall) => (
                    <tr key={call.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50">
                      <td className="whitespace-nowrap px-3 py-2 font-medium text-slate-800 dark:text-slate-100">{call.contactNumber}</td>
                      <td className="whitespace-nowrap px-3 py-2 text-slate-600 dark:text-slate-300">{call.agentExtension}</td>
                      <td className="whitespace-nowrap px-3 py-2">
                        <span className={cn("rounded-md px-1.5 py-0.5 text-xs font-medium", CALL_TYPE_BADGE[call.callType] ?? "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300")}>
                          {CALL_TYPE_OPTIONS.find((o) => o.value === call.callType)?.label ?? call.callType}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 tabular-nums text-slate-600 dark:text-slate-300">{formatDueDate(call.startTime)}</td>
                      <td className="whitespace-nowrap px-3 py-2 tabular-nums text-slate-600 dark:text-slate-300">{formatDuration(call.duration)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {filtered.length > 0 && (
            <Pagination
              page={page}
              pageCount={pageCount}
              pageSize={pageSize}
              total={filtered.length}
              rangeStart={start + 1}
              rangeEnd={end}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
              pageSizeOptions={[20, 50, 100, "all"]}
            />
          )}
        </>
      )}
    </div>
  );
}
