export type ArchiveModule = "task" | "dispute" | "achat" | "conversation";

export interface ArchivedItem {
  id: string;
  module: ArchiveModule;
  originalId: string;
  title: string;
  archivedAt: string;
  archivedBy: string;
  batchId: string;
}

/** One "Archive" run, grouping every item it created — the UI shows one row
 * per batch instead of one per archived task/conversation/item. */
export interface ArchiveBatch {
  batchId: string;
  module: ArchiveModule;
  archivedAt: string;
  archivedBy: string;
  count: number;
}

export interface ArchiveFilters {
  module: ArchiveModule;
  /** Task/dispute only — a StatusDef id. */
  statusId?: string;
  /** ISO date string. Tasks/disputes/achats: rows updated/created before this date. Conversations: inactive (no messages) since this date. */
  beforeDate?: string;
}

export interface DbSizeInfo {
  bytes: number;
  limitBytes: number;
  percent: number;
  level: "ok" | "warning" | "critical";
  formatted: string;
}
