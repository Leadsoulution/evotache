import type { PurchaseColumnDef as DbPurchaseColumnDef, PurchaseItem as DbPurchaseItem } from "@/generated/prisma/client";
import type { PurchaseColumnDef, PurchaseDropdownOption, PurchaseItem } from "@/types/purchase";

export function toPublicPurchaseColumn(column: DbPurchaseColumnDef): PurchaseColumnDef {
  return {
    id: column.id,
    name: column.name,
    type: column.type,
    options: (column.options as unknown as PurchaseDropdownOption[]) ?? [],
    order: column.order,
    createdAt: column.createdAt.toISOString(),
  };
}

export function toPublicPurchaseItem(item: DbPurchaseItem): PurchaseItem {
  return {
    id: item.id,
    order: item.order,
    values: (item.values as Record<string, string>) ?? {},
    assigneeIds: item.assigneeIds,
    excludedUserIds: item.excludedUserIds,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  };
}
