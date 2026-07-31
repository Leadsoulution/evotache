"use client";

import useSWR, { mutate as globalMutate } from "swr";
import { createArchive, fetchArchivedItems, fetchArchivePreview, fetchDbSize, restoreArchivedItem } from "@/services/archiveApi";
import { useToast } from "@/components/ui/Toast";
import type { ArchiveFilters, ArchivedItem, ArchiveModule, DbSizeInfo } from "@/types/archive";

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

export function useArchivedItems() {
  const toast = useToast();
  const { data, error, isLoading, mutate } = useSWR<ArchivedItem[]>(ARCHIVED_ITEMS_KEY, () => fetchArchivedItems());
  const items = data ?? [];

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

  async function restore(id: string): Promise<boolean> {
    const previous = items;
    const restoredModule = previous.find((item) => item.id === id)?.module;
    await mutate(previous.filter((item) => item.id !== id), { revalidate: false });
    try {
      await restoreArchivedItem(id);
      if (restoredModule) invalidateModuleCaches(restoredModule);
      return true;
    } catch (err) {
      await mutate(previous, { revalidate: false });
      toast.error(err instanceof Error ? err.message : "Failed to restore.");
      return false;
    }
  }

  return { items, loading: isLoading, error: Boolean(error), archive, restore };
}

export async function previewArchive(filters: ArchiveFilters): Promise<number> {
  return fetchArchivePreview(filters);
}
