"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { useAdProjects } from "@/hooks/useAdProjects";
import { useAdCampaigns } from "@/hooks/useAdCampaigns";
import { canManageWorkflow } from "@/config/roleMeta";
import { AdCampaignDialog } from "./AdCampaignDialog";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { FilterMenu } from "@/components/ui/FilterMenu";
import { Menu } from "@/components/ui/Menu";
import { StatTile } from "@/components/stats/StatTile";
import { TaskListSkeleton } from "@/components/task-list/TaskListSkeleton";
import { computeCampaignMetrics, formatCurrency, formatNumber, formatPercent, formatRatio } from "@/lib/adMetrics";
import { formatDueDate } from "@/lib/date";
import {
  PLATFORM_META,
  PLATFORM_ORDER,
  CAMPAIGN_OBJECTIVE_META,
  CAMPAIGN_OBJECTIVE_ORDER,
  CAMPAIGN_STATUS_META,
  CAMPAIGN_STATUS_ORDER,
} from "@/config/socialMeta";
import {
  ArrowLeftIcon,
  ChartBarIcon,
  CheckIcon,
  ChevronDownIcon,
  ClockIcon,
  MegaphoneIcon,
  PencilIcon,
  PlusIcon,
  SearchIcon,
  SortIcon,
  TrashIcon,
  TrendingUpIcon,
} from "@/components/ui/icons";
import type { AdCampaign } from "@/types/socialMedia";

type SortField = "name" | "budget" | "amountSpent" | "results" | "roas" | "createdAt";

const SORT_OPTIONS: { value: SortField; label: string }[] = [
  { value: "createdAt", label: "Created date" },
  { value: "name", label: "Name" },
  { value: "budget", label: "Budget" },
  { value: "amountSpent", label: "Amount spent" },
  { value: "results", label: "Results" },
  { value: "roas", label: "ROAS" },
];

export function AdCampaignsView({ projectId }: { projectId: string }) {
  const { user } = useAuth();
  const canManage = user ? canManageWorkflow(user.role) : false;
  const { projects, loadState: projectsLoadState } = useAdProjects();
  const { campaigns, loadState, addCampaign, editCampaign, removeCampaign } = useAdCampaigns(projectId);

  const project = projects.find((p) => p.id === projectId) ?? null;

  const [search, setSearch] = useState("");
  const [platformFilter, setPlatformFilter] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [objectiveFilter, setObjectiveFilter] = useState<string[]>([]);
  const [sortField, setSortField] = useState<SortField>("createdAt");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<AdCampaign | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return campaigns.filter((c) => {
      if (query && !c.name.toLowerCase().includes(query)) return false;
      if (platformFilter.length && !platformFilter.includes(c.platform)) return false;
      if (statusFilter.length && !statusFilter.includes(c.status)) return false;
      if (objectiveFilter.length && !objectiveFilter.includes(c.objective)) return false;
      return true;
    });
  }, [campaigns, search, platformFilter, statusFilter, objectiveFilter]);

  const sorted = useMemo(() => {
    const withMetrics = filtered.map((c) => ({ campaign: c, metrics: computeCampaignMetrics(c) }));
    withMetrics.sort((a, b) => {
      let cmp = 0;
      if (sortField === "name") cmp = a.campaign.name.localeCompare(b.campaign.name);
      else if (sortField === "roas") cmp = (a.metrics.roas ?? -1) - (b.metrics.roas ?? -1);
      else if (sortField === "createdAt") cmp = a.campaign.createdAt.localeCompare(b.campaign.createdAt);
      else cmp = a.campaign[sortField] - b.campaign[sortField];
      return sortDirection === "asc" ? cmp : -cmp;
    });
    return withMetrics;
  }, [filtered, sortField, sortDirection]);

  const kpis = useMemo(() => {
    const totalSpend = filtered.reduce((sum, c) => sum + c.amountSpent, 0);
    const totalResults = filtered.reduce((sum, c) => sum + c.results, 0);
    const totalClicks = filtered.reduce((sum, c) => sum + c.clicks, 0);
    const totalRevenue = filtered.reduce((sum, c) => sum + c.revenue, 0);
    const avgCpc = totalClicks > 0 ? totalSpend / totalClicks : null;
    const avgRoas = totalSpend > 0 ? totalRevenue / totalSpend : null;
    const activeCount = filtered.filter((c) => c.status === "active").length;
    return { totalSpend, totalResults, avgCpc, avgRoas, activeCount };
  }, [filtered]);

  const isLoading = loadState === "loading" || projectsLoadState === "loading";
  const pendingCampaign = campaigns.find((c) => c.id === pendingDeleteId) ?? null;

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-4 px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-1">
        <Link href="/social/ads" className="inline-flex w-fit items-center gap-1 text-xs font-medium text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400">
          <ArrowLeftIcon className="h-3 w-3" />
          Ads projects
        </Link>
        <header className="flex items-center justify-between gap-2">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">{project?.name ?? "Campaigns"}</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">{project?.client ?? "Manage this project's advertising campaigns."}</p>
          </div>
          {canManage && (
            <button
              type="button"
              onClick={() => {
                setEditingCampaign(null);
                setDialogOpen(true);
              }}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-500"
            >
              <PlusIcon className="h-4 w-4" />
              New campaign
            </button>
          )}
        </header>
      </div>

      {isLoading && <TaskListSkeleton />}

      {!isLoading && (
        <>
          <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <StatTile label="Total spend" value={formatCurrency(kpis.totalSpend)} icon={<MegaphoneIcon className="h-4.5 w-4.5" />} />
            <StatTile label="Total results" value={formatNumber(kpis.totalResults)} icon={<CheckIcon className="h-4.5 w-4.5" />} />
            <StatTile label="Average CPC" value={formatCurrency(kpis.avgCpc)} icon={<ClockIcon className="h-4.5 w-4.5" />} />
            <StatTile label="Average ROAS" value={formatRatio(kpis.avgRoas)} icon={<TrendingUpIcon className="h-4.5 w-4.5" />} />
            <StatTile label="Active campaigns" value={kpis.activeCount} icon={<ChartBarIcon className="h-4.5 w-4.5" />} />
          </section>

          <div className="flex flex-wrap items-center gap-2">
            <label className="relative">
              <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search campaigns…"
                className="w-56 rounded-lg border border-slate-200 bg-white py-1.5 pl-8 pr-2.5 text-sm text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:focus:ring-indigo-950"
              />
            </label>
            <FilterMenu
              label="Platform"
              count={platformFilter.length}
              options={PLATFORM_ORDER.map((p) => ({ value: p, label: PLATFORM_META[p].label }))}
              value={platformFilter}
              onChange={setPlatformFilter}
            />
            <FilterMenu
              label="Status"
              count={statusFilter.length}
              options={CAMPAIGN_STATUS_ORDER.map((s) => ({ value: s, label: CAMPAIGN_STATUS_META[s].label }))}
              value={statusFilter}
              onChange={setStatusFilter}
            />
            <FilterMenu
              label="Objective"
              count={objectiveFilter.length}
              options={CAMPAIGN_OBJECTIVE_ORDER.map((o) => ({ value: o, label: CAMPAIGN_OBJECTIVE_META[o].label }))}
              value={objectiveFilter}
              onChange={setObjectiveFilter}
            />
            <div className="ml-auto flex items-center gap-1">
              <Menu
                options={SORT_OPTIONS}
                value={[sortField]}
                onChange={(next) => setSortField(next[0] as SortField)}
                ariaLabel="Sort by"
                align="end"
                renderTrigger={() => (
                  <span className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">
                    Sort: {SORT_OPTIONS.find((o) => o.value === sortField)?.label}
                    <ChevronDownIcon className="h-3.5 w-3.5 opacity-60" />
                  </span>
                )}
              />
              <button
                type="button"
                onClick={() => setSortDirection((d) => (d === "asc" ? "desc" : "asc"))}
                className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
                aria-label="Toggle sort direction"
              >
                <SortIcon className={`h-3.5 w-3.5 transition-transform ${sortDirection === "desc" ? "rotate-180" : ""}`} />
              </button>
            </div>
          </div>

          {sorted.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-slate-200 bg-white px-6 py-16 text-center dark:border-slate-800 dark:bg-slate-900">
              <ChartBarIcon className="h-10 w-10 text-slate-300 dark:text-slate-700" />
              <p className="text-sm font-medium text-slate-700 dark:text-slate-200">No campaigns match your filters</p>
            </div>
          )}

          {sorted.length > 0 && (
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <table className="w-full min-w-[1500px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:text-slate-400">
                    {[
                      "Campaign",
                      "Platform",
                      "Objective",
                      "Status",
                      "Budget",
                      "Spent",
                      "Cost/Result",
                      "Results",
                      "Reach",
                      "Impressions",
                      "Clicks",
                      "CTR",
                      "CPC",
                      "CPM",
                      "ROAS",
                      "Conv. Rate",
                      "Created",
                    ].map((header) => (
                      <th key={header} scope="col" className="whitespace-nowrap px-3 py-2">
                        {header}
                      </th>
                    ))}
                    <th scope="col" className="px-3 py-2" aria-hidden="true" />
                  </tr>
                </thead>
                <tbody>
                  {sorted.map(({ campaign, metrics }) => {
                    const platform = PLATFORM_META[campaign.platform];
                    const objective = CAMPAIGN_OBJECTIVE_META[campaign.objective];
                    const status = CAMPAIGN_STATUS_META[campaign.status];
                    return (
                      <tr key={campaign.id} className="group border-b border-slate-100 last:border-0 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50">
                        <td className="max-w-[220px] truncate px-3 py-2 font-medium text-slate-800 dark:text-slate-100">{campaign.name}</td>
                        <td className="px-3 py-2">
                          <span className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold" style={{ backgroundColor: `${platform.color}22`, color: platform.color }}>
                            {platform.label}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          <span className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold" style={{ backgroundColor: `${objective.color}22`, color: objective.color }}>
                            {objective.label}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          <span className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold" style={{ backgroundColor: `${status.color}22`, color: status.color }}>
                            {status.label}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 tabular-nums text-slate-600 dark:text-slate-300">{formatCurrency(campaign.budget)}</td>
                        <td className="whitespace-nowrap px-3 py-2 tabular-nums text-slate-600 dark:text-slate-300">{formatCurrency(campaign.amountSpent)}</td>
                        <td className="whitespace-nowrap px-3 py-2 tabular-nums text-slate-600 dark:text-slate-300">{formatCurrency(metrics.costPerResult)}</td>
                        <td className="whitespace-nowrap px-3 py-2 tabular-nums text-slate-600 dark:text-slate-300">{formatNumber(campaign.results)}</td>
                        <td className="whitespace-nowrap px-3 py-2 tabular-nums text-slate-600 dark:text-slate-300">{formatNumber(campaign.reach)}</td>
                        <td className="whitespace-nowrap px-3 py-2 tabular-nums text-slate-600 dark:text-slate-300">{formatNumber(campaign.impressions)}</td>
                        <td className="whitespace-nowrap px-3 py-2 tabular-nums text-slate-600 dark:text-slate-300">{formatNumber(campaign.clicks)}</td>
                        <td className="whitespace-nowrap px-3 py-2 tabular-nums text-slate-600 dark:text-slate-300">{formatPercent(metrics.ctr)}</td>
                        <td className="whitespace-nowrap px-3 py-2 tabular-nums text-slate-600 dark:text-slate-300">{formatCurrency(metrics.cpc)}</td>
                        <td className="whitespace-nowrap px-3 py-2 tabular-nums text-slate-600 dark:text-slate-300">{formatCurrency(metrics.cpm)}</td>
                        <td className="whitespace-nowrap px-3 py-2 tabular-nums font-semibold text-slate-700 dark:text-slate-200">{formatRatio(metrics.roas)}</td>
                        <td className="whitespace-nowrap px-3 py-2 tabular-nums text-slate-600 dark:text-slate-300">{formatPercent(metrics.conversionRate)}</td>
                        <td className="whitespace-nowrap px-3 py-2 text-slate-400">{formatDueDate(campaign.createdAt)}</td>
                        <td className="px-3 py-2 text-right">
                          {canManage && (
                            <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingCampaign(campaign);
                                  setDialogOpen(true);
                                }}
                                className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700"
                                aria-label={`Edit ${campaign.name}`}
                              >
                                <PencilIcon className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setPendingDeleteId(campaign.id)}
                                className="rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950 dark:hover:text-red-400"
                                aria-label={`Delete ${campaign.name}`}
                              >
                                <TrashIcon className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      <AdCampaignDialog
        open={dialogOpen}
        campaign={editingCampaign}
        onClose={() => setDialogOpen(false)}
        onSubmit={(input) => (editingCampaign ? editCampaign(editingCampaign.id, input).then(() => true) : addCampaign(input))}
      />

      <ConfirmDialog
        open={pendingDeleteId !== null}
        title="Delete this campaign?"
        description={pendingCampaign ? `"${pendingCampaign.name}" will be permanently deleted. This cannot be undone.` : ""}
        confirmLabel="Delete"
        destructive
        onConfirm={async () => {
          if (pendingDeleteId) await removeCampaign(pendingDeleteId);
          setPendingDeleteId(null);
        }}
        onCancel={() => setPendingDeleteId(null)}
      />
    </div>
  );
}
