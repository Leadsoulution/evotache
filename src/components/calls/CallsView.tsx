"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useCalls } from "@/hooks/useCalls";
import { useThreeCxUsers } from "@/hooks/useThreeCxUsers";
import { usePagination } from "@/hooks/usePagination";
import { canManageUsers, canManageWorkflow } from "@/config/roleMeta";
import { saveThreeCxUserOverride } from "@/services/threeCxUserApi";
import { ThreeCxConnectionCard } from "./ThreeCxConnectionCard";
import { ThreeCxUserSelectorBar } from "./ThreeCxUserSelectorBar";
import { ThreeCxUserManager } from "./ThreeCxUserManager";
import { CallDateRangePicker } from "./CallDateRangePicker";
import { CallTimeRangePicker } from "./CallTimeRangePicker";
import { FilterMenu } from "@/components/ui/FilterMenu";
import { Pagination } from "@/components/ui/Pagination";
import { StatTile } from "@/components/stats/StatTile";
import { ChartCard } from "@/components/stats/ChartCard";
import { BarChart } from "@/components/stats/BarChart";
import { PieChart } from "@/components/stats/PieChart";
import { TaskListSkeleton } from "@/components/task-list/TaskListSkeleton";
import { useToast } from "@/components/ui/Toast";
import { formatDueDate } from "@/lib/date";
import { cn } from "@/lib/cn";
import { DIRECTION_LABEL, STATUS_BADGE, STATUS_LABEL, callsForUser, countByDirection, countByStatus, countByUser, deriveInternalUsers } from "@/lib/callStats";
import { CalendarIcon, CheckIcon, ChevronDownIcon, ClockIcon, PhoneIcon, PhoneMissedIcon, RefreshIcon, SearchIcon, SortIcon } from "@/components/ui/icons";
import type { PhoneCall } from "@/types/call";

type SortField = "source" | "dest" | "direction" | "status" | "startTime" | "ringSeconds" | "talkSeconds";

const COLUMN_SORT_FIELD: { label: string; field: SortField }[] = [
  { label: "Appelant", field: "source" },
  { label: "Appelé", field: "dest" },
  { label: "Direction", field: "direction" },
  { label: "Statut", field: "status" },
  { label: "Date", field: "startTime" },
  { label: "Sonnerie", field: "ringSeconds" },
  { label: "Parole", field: "talkSeconds" },
];

function sortValue(call: PhoneCall, field: SortField): string | number {
  switch (field) {
    case "source":
      return call.sourceName || call.sourceNumber;
    case "dest":
      return call.destName || call.destNumber;
    case "direction":
      return call.direction;
    case "status":
      return call.status;
    case "startTime":
      return call.startTime;
    case "ringSeconds":
      return call.ringSeconds;
    case "talkSeconds":
      return call.talkSeconds;
  }
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

// Local (browser) hour:minute:second — locale-independent, always 24h, so
// it can double as both the display string and the filter comparison key.
function formatCallTime(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`;
}

function callHourMinute(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

// Real opening hours: 09:30–19:00 every day, except Friday which splits
// around the midday break (09:30–13:00, then 15:00–19:00).
function isWithinBusinessHours(iso: string): boolean {
  const d = new Date(iso);
  const hm = callHourMinute(iso);
  const windows = d.getDay() === 5 ? [["09:30", "13:00"], ["15:00", "19:00"]] : [["09:30", "19:00"]];
  return windows.some(([from, to]) => hm >= from && hm <= to);
}

export function CallsView() {
  const { user } = useAuth();
  const router = useRouter();
  const allowed = user ? canManageUsers(user.role) || canManageWorkflow(user.role) : false;
  const { calls, stats, loading, refetch } = useCalls();
  const { overrides, refetch: refetchOverrides } = useThreeCxUsers();
  const toast = useToast();
  const [syncing, setSyncing] = useState(false);
  const [managingUsers, setManagingUsers] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [directionFilter, setDirectionFilter] = useState<string[]>([]);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [dateRangeLabel, setDateRangeLabel] = useState("Toutes les dates");
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [timeFrom, setTimeFrom] = useState("");
  const [timeTo, setTimeTo] = useState("");
  const [businessHoursOnly, setBusinessHoursOnly] = useState(false);
  const [timeRangeLabel, setTimeRangeLabel] = useState("Toute la journée");
  const [timePickerOpen, setTimePickerOpen] = useState(false);
  const [pageSize, setPageSize] = useState<number | "all">(20);
  const [sortField, setSortField] = useState<SortField>("startTime");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [selectedUserDn, setSelectedUserDn] = useState<string | null>(null);

  // Real 3CX users/extensions, derived from the synced call data itself —
  // shown as an avatar-row selector matching the Statistics page's
  // UserSelectorBar, not fetched via a separate "list users" API call.
  const internalUsers = useMemo(() => deriveInternalUsers(calls, overrides), [calls, overrides]);

  // If the selected user gets hidden (this tab or another), stop filtering
  // by a dn that's no longer selectable — derived at render time rather
  // than via an effect + setState, which would trigger an extra render.
  const effectiveSelectedDn = selectedUserDn && !internalUsers.find((u) => u.dn === selectedUserDn)?.hidden ? selectedUserDn : null;

  async function handleSaveUserOverride(dn: string, patch: { name?: string; color?: string; hidden?: boolean }) {
    try {
      await saveThreeCxUserOverride(dn, patch);
      refetchOverrides();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Échec de la mise à jour.");
    }
  }

  function handleSort(field: SortField) {
    if (field === sortField) setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortField(field);
      setSortDirection("asc");
    }
  }

  async function handleSync() {
    setSyncing(true);
    try {
      const res = await fetch("/api/calls/sync", { method: "POST" });
      const data = (await res.json()) as { synced: number; missed: number; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Sync failed.");
      toast.success(`Synchronisé : ${data.synced} appel(s), dont ${data.missed} manqué(s).`);
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sync failed.");
    } finally {
      setSyncing(false);
    }
  }

  // Built from whatever status values are actually present in the synced
  // data, rather than a hardcoded list — adapts automatically if 3CX ever
  // returns a status beyond the ones already mapped in STATUS_LABEL.
  const statusOptions = useMemo(() => {
    const values = new Set<string>();
    for (const c of calls) values.add(c.status);
    return Array.from(values)
      .sort()
      .map((v) => ({ value: v, label: STATUS_LABEL[v] ?? v }));
  }, [calls]);
  const directionOptions = useMemo(() => {
    const values = new Set<string>();
    for (const c of calls) values.add(c.direction);
    return Array.from(values)
      .sort()
      .map((v) => ({ value: v, label: DIRECTION_LABEL[v] ?? v }));
  }, [calls]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    const base = effectiveSelectedDn ? callsForUser(calls, effectiveSelectedDn) : calls;
    return base.filter((c) => {
      if (query && !c.sourceNumber.toLowerCase().includes(query) && !c.destNumber.toLowerCase().includes(query)) return false;
      if (statusFilter.length && !statusFilter.includes(c.status)) return false;
      if (directionFilter.length && !directionFilter.includes(c.direction)) return false;
      if (dateFrom && c.startTime < dateFrom) return false;
      if (dateTo && c.startTime > `${dateTo}T23:59:59`) return false;
      if (businessHoursOnly) {
        if (!isWithinBusinessHours(c.startTime)) return false;
      } else if (timeFrom || timeTo) {
        const hm = callHourMinute(c.startTime);
        if (timeFrom && hm < timeFrom) return false;
        if (timeTo && hm > timeTo) return false;
      }
      return true;
    });
  }, [calls, search, statusFilter, directionFilter, dateFrom, dateTo, timeFrom, timeTo, businessHoursOnly, effectiveSelectedDn]);

  const sorted = useMemo(() => {
    const copy = [...filtered];
    copy.sort((a, b) => {
      const av = sortValue(a, sortField);
      const bv = sortValue(b, sortField);
      const cmp = typeof av === "number" && typeof bv === "number" ? av - bv : String(av).localeCompare(String(bv));
      return sortDirection === "asc" ? cmp : -cmp;
    });
    return copy;
  }, [filtered, sortField, sortDirection]);

  const hasActiveFilter = Boolean(
    search.trim() || statusFilter.length || directionFilter.length || dateFrom || dateTo || timeFrom || timeTo || businessHoursOnly || effectiveSelectedDn
  );

  // With no filter active, the tiles use the real aggregate counts from the
  // API (`stats`) rather than the fetched/capped `calls` list — otherwise
  // "Total appels" freezes forever once the real count passes MAX_ROWS
  // (the table only ever fetches the most recent 2000 rows). Once a filter
  // narrows things down, there's no equivalent aggregate query per filter
  // combination, so the tiles fall back to counting within that capped
  // recent-history window, same as the table/charts below.
  const kpis = useMemo(() => {
    if (!hasActiveFilter) {
      const answeredPct = stats.total ? Math.round((stats.answered / stats.total) * 100) : 0;
      const missedPct = stats.total ? Math.round((stats.missed / stats.total) * 100) : 0;
      return { total: stats.total, answered: stats.answered, missed: stats.missed, avgTalk: stats.avgTalk, answeredPct, missedPct };
    }
    const answered = filtered.filter((c) => c.answered);
    const missed = filtered.filter((c) => c.status === "Unanswered");
    const avgTalk = answered.length ? Math.round(answered.reduce((sum, c) => sum + c.talkSeconds, 0) / answered.length) : 0;
    const answeredPct = filtered.length ? Math.round((answered.length / filtered.length) * 100) : 0;
    const missedPct = filtered.length ? Math.round((missed.length / filtered.length) * 100) : 0;
    return { total: filtered.length, answered: answered.length, missed: missed.length, avgTalk, answeredPct, missedPct };
  }, [filtered, hasActiveFilter, stats]);

  const { page, setPage, pageCount, start, end } = usePagination(sorted.length, pageSize);
  const paged = sorted.slice(start, end);

  // Charts follow the same filtered set as the KPI tiles, so narrowing by
  // user/status/direction/date visibly reshapes them too.
  const statusChart = useMemo(() => countByStatus(filtered), [filtered]);
  const directionChart = useMemo(() => countByDirection(filtered), [filtered]);
  const userChart = useMemo(() => countByUser(filtered, internalUsers), [filtered, internalUsers]);

  useEffect(() => {
    if (user && !allowed) router.replace("/");
  }, [user, allowed, router]);

  if (!allowed) return null;

  return (
    <div className="mx-auto flex w-full max-w-[95%] flex-col gap-4 px-4 py-8 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">Appels</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Historique des appels — synchronisé depuis 3CX à la demande.</p>
        </div>
        <button
          type="button"
          onClick={handleSync}
          disabled={syncing}
          className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshIcon className="h-4 w-4" />
          {syncing ? "Synchronisation…" : "Synchroniser"}
        </button>
      </header>

      <ThreeCxConnectionCard />

      {loading && <TaskListSkeleton />}

      {!loading && (
        <>
          <ThreeCxUserSelectorBar users={internalUsers} selectedDn={effectiveSelectedDn} onSelect={setSelectedUserDn} onManage={() => setManagingUsers(true)} />
          <ThreeCxUserManager open={managingUsers} users={internalUsers} onClose={() => setManagingUsers(false)} onSave={handleSaveUserOverride} />

          <section className="sticky top-0 z-10 grid grid-cols-2 gap-3 bg-slate-50 py-2 sm:grid-cols-4 dark:bg-slate-950">
            <StatTile label="Total appels" value={kpis.total} icon={<PhoneIcon className="h-4.5 w-4.5" />} />
            <StatTile label="Répondus" value={`${kpis.answered} (${kpis.answeredPct}%)`} icon={<CheckIcon className="h-4.5 w-4.5" />} />
            <StatTile
              label="Manqués"
              value={`${kpis.missed} (${kpis.missedPct}%)`}
              icon={<PhoneMissedIcon className="h-4.5 w-4.5" />}
              tone={kpis.missed > 0 ? "warning" : "default"}
            />
            <StatTile label="Durée moyenne (parlé)" value={formatDuration(kpis.avgTalk)} icon={<ClockIcon className="h-4.5 w-4.5" />} />
          </section>

          <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <ChartCard title="Appels par statut">
              <PieChart data={statusChart} />
            </ChartCard>
            <ChartCard title="Appels par direction">
              <PieChart data={directionChart} />
            </ChartCard>
            <ChartCard title="Appels par utilisateur">
              <BarChart data={userChart} />
            </ChartCard>
          </section>

          <div className="flex flex-wrap items-center gap-2">
            <label className="relative">
              <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Rechercher un numéro…"
                className="w-64 rounded-lg border border-slate-200 bg-white py-1.5 pl-8 pr-2.5 text-sm text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:focus:ring-indigo-950"
              />
            </label>
            {statusOptions.length > 0 && (
              <FilterMenu label="Statut" count={statusFilter.length} options={statusOptions} value={statusFilter} onChange={setStatusFilter} />
            )}
            {directionOptions.length > 0 && (
              <FilterMenu label="Direction" count={directionFilter.length} options={directionOptions} value={directionFilter} onChange={setDirectionFilter} />
            )}
            <button
              type="button"
              onClick={() => setDatePickerOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <CalendarIcon className="h-3.5 w-3.5 opacity-60" />
              {dateRangeLabel}
              <ChevronDownIcon className="h-3.5 w-3.5 opacity-60" />
            </button>
            <button
              type="button"
              onClick={() => setTimePickerOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <ClockIcon className="h-3.5 w-3.5 opacity-60" />
              {timeRangeLabel}
              <ChevronDownIcon className="h-3.5 w-3.5 opacity-60" />
            </button>
            <CallDateRangePicker
              open={datePickerOpen}
              onClose={() => setDatePickerOpen(false)}
              onApply={(range, label) => {
                setDateFrom(range.from ?? "");
                setDateTo(range.to ?? "");
                setDateRangeLabel(label);
              }}
            />
            <CallTimeRangePicker
              open={timePickerOpen}
              onClose={() => setTimePickerOpen(false)}
              onApply={(range, label, businessHours) => {
                setBusinessHoursOnly(Boolean(businessHours));
                setTimeFrom(businessHours ? "" : range.from);
                setTimeTo(businessHours ? "" : range.to);
                setTimeRangeLabel(label);
              }}
            />
          </div>

          {sorted.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-slate-200 bg-white px-6 py-16 text-center dark:border-slate-800 dark:bg-slate-900">
              <PhoneIcon className="h-10 w-10 text-slate-300 dark:text-slate-700" />
              <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                {calls.length === 0 ? "Aucun appel synchronisé pour l'instant — clique sur \"Synchroniser\"." : "Aucun appel ne correspond aux filtres."}
              </p>
            </div>
          )}

          {sorted.length > 0 && (
            <div className="min-w-0 overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <table className="w-full min-w-[860px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:text-slate-400">
                    {COLUMN_SORT_FIELD.map(({ label, field }) => (
                      <th key={field} scope="col" className="whitespace-nowrap px-3 py-2">
                        <button type="button" onClick={() => handleSort(field)} className="inline-flex items-center gap-1 hover:text-slate-700 dark:hover:text-slate-200">
                          {label}
                          <SortIcon
                            className={cn(
                              "h-3 w-3 transition-transform",
                              sortField === field ? "opacity-100" : "opacity-30",
                              sortField === field && sortDirection === "asc" && "rotate-180"
                            )}
                          />
                        </button>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paged.map((call: PhoneCall) => (
                    <tr key={call.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50">
                      <td className="whitespace-nowrap px-3 py-2 font-medium text-slate-800 dark:text-slate-100">{call.sourceName || call.sourceNumber}</td>
                      <td className="whitespace-nowrap px-3 py-2 text-slate-600 dark:text-slate-300">{call.destName || call.destNumber}</td>
                      <td className="whitespace-nowrap px-3 py-2 text-slate-600 dark:text-slate-300">{DIRECTION_LABEL[call.direction] ?? call.direction}</td>
                      <td className="whitespace-nowrap px-3 py-2">
                        <span className={cn("rounded-md px-1.5 py-0.5 text-xs font-medium", STATUS_BADGE[call.status] ?? "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300")}>
                          {statusOptions.find((o) => o.value === call.status)?.label ?? call.status}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 tabular-nums text-slate-600 dark:text-slate-300">
                        <div>{formatDueDate(call.startTime)}</div>
                        <div className="text-xs text-slate-400 dark:text-slate-500">{formatCallTime(call.startTime)}</div>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 tabular-nums text-slate-600 dark:text-slate-300">{formatDuration(call.ringSeconds)}</td>
                      <td className="whitespace-nowrap px-3 py-2 tabular-nums text-slate-600 dark:text-slate-300">{formatDuration(call.talkSeconds)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {sorted.length > 0 && (
            <Pagination
              page={page}
              pageCount={pageCount}
              pageSize={pageSize}
              total={sorted.length}
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
