import { db } from "@/lib/db";
import { deleteFile, uploadFile } from "@/lib/storage";
import { toPublicTask } from "@/lib/publicTask";
import { getDescendantIds } from "@/lib/taskTree";
import { generateId } from "@/lib/id";
import type { ArchivedItem } from "@/generated/prisma/client";
import type { ArchiveFilters, DbSizeInfo } from "@/types/archive";

const DB_SIZE_LIMIT_BYTES = 500 * 1024 * 1024; // Supabase free-tier Postgres limit

export async function getDbSize(): Promise<DbSizeInfo> {
  const [{ bytes, formatted }] = await db.$queryRaw<{ bytes: bigint; formatted: string }[]>`
    SELECT pg_database_size(current_database()) AS bytes, pg_size_pretty(pg_database_size(current_database())) AS formatted
  `;
  const numBytes = Number(bytes);
  const percent = (numBytes / DB_SIZE_LIMIT_BYTES) * 100;
  const level = percent >= 95 ? "critical" : percent >= 80 ? "warning" : "ok";
  return { bytes: numBytes, limitBytes: DB_SIZE_LIMIT_BYTES, percent, level, formatted };
}

async function uploadJson(payload: unknown): Promise<string> {
  const buffer = Buffer.from(JSON.stringify(payload));
  return uploadFile(buffer, "archives", "application/json", "json");
}

/** For task/dispute: matched roots = tasks matching the filter that aren't themselves a descendant of another matched task (avoids double-archiving a subtree). */
async function findTaskArchiveRoots(filters: ArchiveFilters): Promise<string[]> {
  const taskModule = filters.module as "task" | "dispute";
  const allDbTasks = await db.task.findMany({ where: { module: taskModule } });
  const allTasks = allDbTasks.map(toPublicTask);

  const matched = allTasks.filter((t) => {
    if (filters.statusId && t.status !== filters.statusId) return false;
    if (filters.beforeDate && new Date(t.updatedAt) >= new Date(filters.beforeDate)) return false;
    return true;
  });
  const matchedIds = new Set(matched.map((t) => t.id));

  // A matched task is a "root" unless one of its ancestors is also matched
  // (that ancestor's archive already sweeps this task's whole subtree).
  const idToTask = new Map(allTasks.map((t) => [t.id, t]));
  function hasMatchedAncestor(task: (typeof allTasks)[number]): boolean {
    let current = task.parentId ? idToTask.get(task.parentId) : undefined;
    while (current) {
      if (matchedIds.has(current.id)) return true;
      current = current.parentId ? idToTask.get(current.parentId) : undefined;
    }
    return false;
  }

  return matched.filter((t) => !hasMatchedAncestor(t)).map((t) => t.id);
}

async function archiveTaskRoot(rootId: string, module: "task" | "dispute", archivedBy: string, batchId: string): Promise<void> {
  const allDbTasks = await db.task.findMany({ where: { module } });
  const allTasks = allDbTasks.map(toPublicTask);
  const idSet = new Set([rootId, ...getDescendantIds(allTasks, rootId)]);

  const tasks = allDbTasks.filter((t) => idSet.has(t.id));
  const attachments = await db.attachment.findMany({ where: { taskId: { in: Array.from(idSet) } } });
  const root = tasks.find((t) => t.id === rootId)!;

  const storageKey = await uploadJson({ tasks, attachments });

  await db.attachment.deleteMany({ where: { taskId: { in: Array.from(idSet) } } });
  await db.task.delete({ where: { id: rootId } }); // cascades the rest of the subtree

  await db.archivedItem.create({
    data: { module, originalId: rootId, title: root.title, archivedBy, storageKey, batchId },
  });
}

async function findConversationCandidates(filters: ArchiveFilters) {
  return db.conversation.findMany({
    where: filters.beforeDate ? { lastMessageAt: { lt: new Date(filters.beforeDate) } } : {},
  });
}

async function archiveConversation(conversationId: string, archivedBy: string, batchId: string): Promise<void> {
  const conversation = await db.conversation.findUnique({ where: { id: conversationId } });
  if (!conversation) return;
  const messages = await db.message.findMany({ where: { conversationId } });
  const storageKey = await uploadJson({ conversation, messages });

  await db.conversation.delete({ where: { id: conversationId } }); // cascades messages

  const title = conversation.name ?? (conversation.type === "direct" ? "Direct message" : "Group chat");
  await db.archivedItem.create({
    data: { module: "conversation", originalId: conversationId, title, archivedBy, storageKey, batchId },
  });
}

async function findPurchaseItemCandidates(filters: ArchiveFilters) {
  return db.purchaseItem.findMany({
    where: filters.beforeDate ? { createdAt: { lt: new Date(filters.beforeDate) } } : {},
  });
}

async function purchaseItemTitle(values: Record<string, unknown>): Promise<string> {
  const textColumns = await db.purchaseColumnDef.findMany({ where: { type: "text" }, orderBy: { order: "asc" } });
  for (const column of textColumns) {
    const value = values[column.id];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "Purchase item";
}

async function archivePurchaseItem(itemId: string, archivedBy: string, batchId: string): Promise<void> {
  const item = await db.purchaseItem.findUnique({ where: { id: itemId } });
  if (!item) return;
  const storageKey = await uploadJson({ item });
  await db.purchaseItem.delete({ where: { id: itemId } });

  const title = await purchaseItemTitle(item.values as Record<string, unknown>);
  await db.archivedItem.create({
    data: { module: "achat", originalId: itemId, title, archivedBy, storageKey, batchId },
  });
}

export async function previewArchiveCount(filters: ArchiveFilters): Promise<number> {
  if (filters.module === "task" || filters.module === "dispute") {
    const roots = await findTaskArchiveRoots(filters);
    return roots.length;
  }
  if (filters.module === "conversation") {
    const rows = await findConversationCandidates(filters);
    return rows.length;
  }
  const rows = await findPurchaseItemCandidates(filters);
  return rows.length;
}

export async function runArchive(filters: ArchiveFilters, archivedBy: string): Promise<number> {
  const batchId = generateId("batch");
  if (filters.module === "task" || filters.module === "dispute") {
    const roots = await findTaskArchiveRoots(filters);
    for (const rootId of roots) await archiveTaskRoot(rootId, filters.module, archivedBy, batchId);
    return roots.length;
  }
  if (filters.module === "conversation") {
    const rows = await findConversationCandidates(filters);
    for (const row of rows) await archiveConversation(row.id, archivedBy, batchId);
    return rows.length;
  }
  const rows = await findPurchaseItemCandidates(filters);
  for (const row of rows) await archivePurchaseItem(row.id, archivedBy, batchId);
  return rows.length;
}

/** Restores one archived row's original record(s) from its storage payload.
 * Doesn't delete the ArchivedItem row itself — callers do that once they
 * know the restore actually succeeded. */
async function restoreOne(archived: ArchivedItem): Promise<boolean> {
  const response = await fetch(archived.storageKey);
  if (!response.ok) return false;
  const payload = await response.json();

  if (archived.module === "task" || archived.module === "dispute") {
    const tasks = payload.tasks as Array<Record<string, unknown> & { id: string; parentId: string | null }>;
    const attachments = payload.attachments as Array<Record<string, unknown>>;
    const remaining = new Map(tasks.map((t) => [t.id, t]));
    // Insert parents before children so the self-referencing FK is satisfied.
    while (remaining.size > 0) {
      const insertable = Array.from(remaining.values()).filter((t) => !t.parentId || !remaining.has(t.parentId as string));
      if (insertable.length === 0) break; // shouldn't happen; avoids an infinite loop on bad data
      for (const t of insertable) {
        await db.task.create({ data: t as never });
        remaining.delete(t.id);
      }
    }
    for (const attachment of attachments) {
      await db.attachment.create({ data: attachment as never });
    }
  } else if (archived.module === "conversation") {
    const conversation = payload.conversation as Record<string, unknown>;
    const messages = payload.messages as Array<Record<string, unknown>>;
    await db.conversation.create({ data: conversation as never });
    for (const message of messages) await db.message.create({ data: message as never });
  } else {
    const item = payload.item as Record<string, unknown>;
    await db.purchaseItem.create({ data: item as never });
  }
  return true;
}

/** Restores every item in a batch (best-effort — one item's storage payload
 * being missing doesn't block the others). Returns how many were restored;
 * only successfully-restored rows are removed from archived_items, so a
 * partially-failed restore can be retried. */
export async function restoreArchivedBatch(batchId: string): Promise<number> {
  const items = await db.archivedItem.findMany({ where: { batchId } });
  let restoredCount = 0;
  for (const item of items) {
    if (await restoreOne(item)) {
      await db.archivedItem.delete({ where: { id: item.id } });
      restoredCount++;
    }
  }
  return restoredCount;
}

/** Permanently deletes a whole archive batch — removes every item's stored
 * payload from Supabase Storage and its archived_items row. Irreversible. */
export async function deleteArchivedBatch(batchId: string): Promise<number> {
  const items = await db.archivedItem.findMany({ where: { batchId } });
  for (const item of items) await deleteFile(item.storageKey);
  const { count } = await db.archivedItem.deleteMany({ where: { batchId } });
  return count;
}
