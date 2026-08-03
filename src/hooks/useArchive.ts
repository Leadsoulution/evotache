"use client";

import { useMemo } from "react";
import useSWR, { mutate as globalMutate } from "swr";
import { createArchive, deleteArchiveBatch, fetchArchivedItems, fetchArchivePreview, fetchDbSize, restoreArchiveBatch } from "@/services/archiveApi";
import { useToast } from "@/components/ui/Toast";
import type { ArchiveBatch, ArchiveFilters, ArchivedItem, ArchiveModule, DbSizeInfo } from "@/types/archive";

const DB_SIZE_KEY = "db-size";
const ARCHIVED_ITEMS_KEY = "archived-items";

/** Archiving/restoring happens from the admin Backup page, but the affected
 * rows are also cached (via SWR) by whichever page normally shows them —
 * Chat, Tasks/Litiges, Achats. Without this, those pages keep showing the
 * pre-archive list until something else happens to revalidate them. */
function invalidateModuleCaches(moduleName: ArchiveModule) {
  if (moduleName === "task" || moduleName === "dispute") {
    void globalMutate(["tasks", moduleName]);
  } else if (moduleName === "conversation") {
    void globalMutate((key) => Array.isArray(key) && key[0] === "chat-conversations");
  } else {
    void globalMutate("purchase-items");
  }
}

export function useDbSize() {
  const { data, error, isLoading, mutate } = useSWR<DbSizeInfo>(DB_SIZE_KEY, fetchDbSize);
  return { dbSize: data ?? null, loading: isLoading, error: Boolean(error), refetch: mutate };
}

function groupIntoBatches(items: ArchivedItem[]): ArchiveBatch[] {
  const byBatch = new Map<string, ArchivedItem[]>();
  for (const item of items) {
    const group = byBatch.get(item.batchId);
    if (group) group.push(item);
    else byBatch.set(item.batchId, [item]);
  }
  const batches: ArchiveBatch[] = Array.from(byBatch.entries()).map(([batchId, groupItems]) => ({
    batchId,
    module: groupItems[0].module,
    archivedAt: groupItems[0].archivedAt,
    archivedBy: groupItems[0].archivedBy,
    count: groupItems.length,
  }));
  batches.sort((a, b) => new Date(b.archivedAt).getTime() - new Date(a.archivedAt).getTime());
  return batches;
}

export function useArchivedItems() {
  const toast = useToast();
  const { data, error, isLoading, mutate } = useSWR<ArchivedItem[]>(ARCHIVED_ITEMS_KEY, () => fetchArchivedItems());
  const items = data ?? [];
  const batches = useMemo(() => groupIntoBatches(data ?? []), [data]);

  async function archive(filters: ArchiveFilters): Promise<number | null> {
    try {
      const archivedCount = await createArchive(filters);
      await mutate();
      if (archivedCount) invalidateModuleCaches(filters.module);
      return archivedCount;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to archive.");
      return null;
    }
  }

  async function restoreBatch(batchId: string): Promise<boolean> {
    const previous = items;
    const restoredModule = previous.find((item) => item.batchId === batchId)?.module;
    await mutate(
      previous.filter((item) => item.batchId !== batchId),
      { revalidate: false }
    );
    try {
      await restoreArchiveBatch(batchId);
      if (restoredModule) invalidateModuleCaches(restoredModule);
      return true;
    } catch (err) {
      await mutate(previous, { revalidate: false });
      toast.error(err instanceof Error ? err.message : "Failed to restore.");
      return false;
    }
  }

  async function deleteBatch(batchId: string): Promise<boolean> {
    const previous = items;
    await mutate(
      previous.filter((item) => item.batchId !== batchId),
      { revalidate: false }
    );
    try {
      await deleteArchiveBatch(batchId);
      return true;
    } catch (err) {
      await mutate(previous, { revalidate: false });
      toast.error(err instanceof Error ? err.message : "Failed to delete.");
      return false;
    }
  }

  return { batches, loading: isLoading, error: Boolean(error), archive, restoreBatch, deleteBatch };
}

export async function previewArchive(filters: ArchiveFilters): Promise<number> {
  return fetchArchivePreview(filters);
}
