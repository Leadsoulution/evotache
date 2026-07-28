"use client";

import { useEffect, useMemo, useState } from "react";
import { usePurchaseColumns } from "@/hooks/usePurchaseColumns";
import { usePurchaseItems } from "@/hooks/usePurchaseItems";
import { useViewPrefs } from "@/hooks/useViewPrefs";
import { usePagination } from "@/hooks/usePagination";
import { useAuth } from "@/hooks/useAuth";
import { canManageUsers } from "@/config/roleMeta";
import { PurchaseTable } from "./PurchaseTable";
import { TaskListSkeleton } from "@/components/task-list/TaskListSkeleton";
import { Pagination } from "@/components/ui/Pagination";
import { AlertTriangleIcon, SearchIcon } from "@/components/ui/icons";
import { fetchAssignees } from "@/services/userApi";
import type { Assignee } from "@/types/task";

export function PurchasesView() {
  const { user } = useAuth();
  const { columns, loadState: columnsLoadState, addColumn, renameColumn, setColumnOptions, removeColumn } = usePurchaseColumns();
  const itemsScope = useMemo(() => (user ? { userId: user.id, isAdmin: canManageUsers(user.role) } : null), [user]);
  const { items, loadState: itemsLoadState, addItem, updateItemValues, updateItemAssignees, updateItemExcludedUsers, removeItem } =
    usePurchaseItems(itemsScope);
  const { columnWidths, setColumnWidth, columnOrder, reorderColumns, pageSize, setPageSize } = useViewPrefs();
  const [search, setSearch] = useState("");
  const [assignees, setAssignees] = useState<Assignee[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetchAssignees().then((list) => {
      if (!cancelled) setAssignees(list);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return items;
    return items.filter((item) => Object.values(item.values).some((value) => value.toLowerCase().includes(query)));
  }, [items, search]);

  const isLoading = columnsLoadState === "loading" || itemsLoadState === "loading";
  const hasError = columnsLoadState === "error" || itemsLoadState === "error";

  const { page: rawPage, setPage, pageCount } = usePagination(filteredItems.length, pageSize);
  const [lastSearch, setLastSearch] = useState(search);
  const searchChanged = search !== lastSearch;
  if (searchChanged) {
    setLastSearch(search);
    setPage(1);
  }
  const page = searchChanged ? 1 : rawPage;
  const pageStart = pageSize === "all" ? 0 : (page - 1) * pageSize;
  const pageEnd = pageSize === "all" ? filteredItems.length : Math.min(pageStart + pageSize, filteredItems.length);
  const pagedItems = useMemo(() => filteredItems.slice(pageStart, pageEnd), [filteredItems, pageStart, pageEnd]);

  return (
    <div className="mx-auto flex w-full max-w-[95%] flex-col gap-4 px-4 py-8 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">Achats</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Suivez vos achats dans un tableau personnalisable — ajoutez ou supprimez des colonnes à tout moment.
        </p>
      </header>

      <div className="flex items-center gap-2">
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Rechercher..."
            aria-label="Search purchases"
            className="w-full min-w-0 rounded-lg border border-slate-200 bg-white py-1.5 pl-8 pr-3 text-sm text-slate-900 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 sm:w-56 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-indigo-950"
          />
        </div>
        <span className="ml-auto text-xs text-slate-400">
          {filteredItems.length} of {items.length}
        </span>
      </div>

      {isLoading && <TaskListSkeleton />}

      {!isLoading && hasError && (
        <div
          role="alert"
          className="flex flex-col items-center justify-center gap-3 rounded-xl border border-red-200 bg-red-50 px-6 py-16 text-center dark:border-red-900 dark:bg-red-950"
        >
          <AlertTriangleIcon className="h-10 w-10 text-red-400" />
          <p className="text-sm font-medium text-red-700 dark:text-red-300">Couldn&apos;t load purchases</p>
        </div>
      )}

      {!isLoading && !hasError && (
        <>
          <PurchaseTable
            columns={columns}
            items={pagedItems}
            assignees={assignees}
            columnWidths={columnWidths}
            onResizeColumn={setColumnWidth}
            columnOrder={columnOrder}
            onReorderColumns={reorderColumns}
            hiddenColumnIds={user?.hiddenColumnIds ?? []}
            onAddColumn={addColumn}
            onRenameColumn={renameColumn}
            onSetColumnOptions={setColumnOptions}
            onDeleteColumn={removeColumn}
            onAddItem={addItem}
            onUpdateItemValues={updateItemValues}
            onUpdateItemAssignees={updateItemAssignees}
            onUpdateItemExcludedUsers={updateItemExcludedUsers}
            onDeleteItem={removeItem}
          />
          {filteredItems.length > 0 && (
            <Pagination
              page={page}
              pageCount={pageCount}
              pageSize={pageSize}
              total={filteredItems.length}
              rangeStart={pageStart + 1}
              rangeEnd={pageEnd}
              onPageChange={setPage}
              onPageSizeChange={(size) => {
                setPageSize(size);
                setPage(1);
              }}
            />
          )}
        </>
      )}
    </div>
  );
}
