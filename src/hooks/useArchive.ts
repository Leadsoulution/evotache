"use client";

import useSWR from "swr";
import { createArchive, fetchArchivedItems, fetchArchivePreview, fetchDbSize, restoreArchivedItem } from "@/services/archiveApi";
import { useToast } from "@/components/ui/Toast";
import type { ArchiveFilters, ArchivedItem, DbSizeInfo } from "@/types/archive";

const DB_SIZE_KEY = "db-size";
const ARCHIVED_ITEMS_KEY = "archived-items";

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
      return archivedCount;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to archive.");
      return null;
    }
  }

  async function restore(id: string): Promise<boolean> {
    const previous = items;
    await mutate(previous.filter((item) => item.id !== id), { revalidate: false });
    try {
      await restoreArchivedItem(id);
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
