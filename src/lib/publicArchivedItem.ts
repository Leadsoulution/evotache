import type { ArchivedItem as DbArchivedItem } from "@/generated/prisma/client";
import type { ArchivedItem } from "@/types/archive";

export function toPublicArchivedItem(item: DbArchivedItem): ArchivedItem {
  return {
    id: item.id,
    module: item.module as ArchivedItem["module"],
    originalId: item.originalId,
    title: item.title,
    archivedAt: item.archivedAt.toISOString(),
    archivedBy: item.archivedBy,
  };
}
