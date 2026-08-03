import { db } from "@/lib/db";
import { clearSheetValues, getSheetValues, updateSheetValues } from "@/lib/googleSheets";
import type { Prisma, TaskModule } from "@/generated/prisma/client";

const TASKS_TAB = "Tasks";
const LITIGES_TAB = "Litiges";
const ACHATS_TAB = "Achats";

// Every field needed to recreate a Task row exactly, stored as the last
// column of each row in the Tasks/Litiges tabs — the human-readable
// columns before it are for glanceability only, restore never reads them.
interface TaskBackupRecord {
  id: string;
  module: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  assigneeIds: string[];
  teamIds: string[];
  excludedUserIds: string[];
  startDate: string | null;
  dueDate: string | null;
  recurrence: unknown;
  order: number;
  customValues: unknown;
  parentId: string | null;
  projectId: string | null;
  createdAt: string;
  updatedAt: string;
}

interface PurchaseBackupRecord {
  id: string;
  order: number;
  values: unknown;
  assigneeIds: string[];
  excludedUserIds: string[];
  createdAt: string;
  updatedAt: string;
}

type TaskRow = Awaited<ReturnType<typeof db.task.findMany>>[number];
type PurchaseItemRow = Awaited<ReturnType<typeof db.purchaseItem.findMany>>[number];

function buildTaskRows(tasks: TaskRow[], statusLabels: Map<string, string>, priorityLabels: Map<string, string>, userNames: Map<string, string>): string[][] {
  const header = ["ID", "Titre", "Description", "Statut", "Priorité", "Assignés", "Échéance", "Créé le", "Modifié le", "JSON"];
  const rows = tasks.map((task) => {
    const record: TaskBackupRecord = {
      id: task.id,
      module: task.module,
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      assigneeIds: task.assigneeIds,
      teamIds: task.teamIds,
      excludedUserIds: task.excludedUserIds,
      startDate: task.startDate ? task.startDate.toISOString() : null,
      dueDate: task.dueDate ? task.dueDate.toISOString() : null,
      recurrence: task.recurrence,
      order: task.order,
      customValues: task.customValues,
      parentId: task.parentId,
      projectId: task.projectId,
      createdAt: task.createdAt.toISOString(),
      updatedAt: task.updatedAt.toISOString(),
    };
    return [
      task.id,
      task.title,
      task.description,
      statusLabels.get(task.status) ?? task.status,
      priorityLabels.get(task.priority) ?? task.priority,
      task.assigneeIds.map((id) => userNames.get(id) ?? id).join(", "),
      task.dueDate ? task.dueDate.toISOString().slice(0, 10) : "",
      task.createdAt.toISOString(),
      task.updatedAt.toISOString(),
      JSON.stringify(record),
    ];
  });
  return [header, ...rows];
}

function buildPurchaseRows(items: PurchaseItemRow[], columnLabels: Map<string, string>, userNames: Map<string, string>): string[][] {
  const header = ["ID", "Résumé", "Assignés", "Créé le", "Modifié le", "JSON"];
  const rows = items.map((item) => {
    const values = (item.values ?? {}) as Record<string, unknown>;
    const summary = Object.entries(values)
      .map(([colId, val]) => `${columnLabels.get(colId) ?? colId}: ${typeof val === "object" ? JSON.stringify(val) : String(val)}`)
      .join("; ");
    const record: PurchaseBackupRecord = {
      id: item.id,
      order: item.order,
      values: item.values,
      assigneeIds: item.assigneeIds,
      excludedUserIds: item.excludedUserIds,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    };
    return [item.id, summary, item.assigneeIds.map((id) => userNames.get(id) ?? id).join(", "), item.createdAt.toISOString(), item.updatedAt.toISOString(), JSON.stringify(record)];
  });
  return [header, ...rows];
}

export async function runBackup(): Promise<{ tasks: number; litiges: number; achats: number }> {
  const config = await db.backupSheetConfig.findFirst();
  if (!config) throw new Error("No Google Sheet linked yet.");

  const [allTasks, purchaseItems, users, statuses, priorities, purchaseColumns] = await Promise.all([
    db.task.findMany({ orderBy: { createdAt: "asc" } }),
    db.purchaseItem.findMany({ orderBy: { createdAt: "asc" } }),
    db.user.findMany({ select: { id: true, name: true } }),
    db.statusDef.findMany(),
    db.priorityDef.findMany(),
    db.purchaseColumnDef.findMany(),
  ]);

  const userNames = new Map(users.map((u) => [u.id, u.name]));
  const statusLabels = new Map(statuses.map((s) => [s.id, s.label]));
  const priorityLabels = new Map(priorities.map((p) => [p.id, p.label]));
  const columnLabels = new Map(purchaseColumns.map((c) => [c.id, c.name]));

  const tasks = allTasks.filter((t) => t.module === "task");
  const litiges = allTasks.filter((t) => t.module === "dispute");

  await clearSheetValues(config.spreadsheetId, TASKS_TAB);
  await updateSheetValues(config.spreadsheetId, TASKS_TAB, buildTaskRows(tasks, statusLabels, priorityLabels, userNames));

  await clearSheetValues(config.spreadsheetId, LITIGES_TAB);
  await updateSheetValues(config.spreadsheetId, LITIGES_TAB, buildTaskRows(litiges, statusLabels, priorityLabels, userNames));

  await clearSheetValues(config.spreadsheetId, ACHATS_TAB);
  await updateSheetValues(config.spreadsheetId, ACHATS_TAB, buildPurchaseRows(purchaseItems, columnLabels, userNames));

  await db.backupSheetConfig.update({ where: { id: config.id }, data: { lastBackupAt: new Date() } });

  return { tasks: tasks.length, litiges: litiges.length, achats: purchaseItems.length };
}

export interface RestoreFailure {
  id: string;
  title: string;
  reason: string;
}

export interface RestoreResult {
  tasksRestored: number;
  litigesRestored: number;
  achatsRestored: number;
  failed: RestoreFailure[];
}

/** Parses each row's trailing JSON column (skips the header row). Rows with
 * unparseable JSON are reported as failures rather than throwing, so one bad
 * row doesn't block restoring everything else. */
function parseBackupRows<T>(rows: string[][], failed: RestoreFailure[]): T[] {
  const out: T[] = [];
  for (const row of rows.slice(1)) {
    if (row.length === 0) continue;
    const raw = row[row.length - 1];
    try {
      out.push(JSON.parse(raw) as T);
    } catch {
      failed.push({ id: row[0] ?? "?", title: row[1] ?? row[0] ?? "?", reason: "Unreadable row in the sheet (invalid JSON)." });
    }
  }
  return out;
}

export async function runRestore(): Promise<RestoreResult> {
  const config = await db.backupSheetConfig.findFirst();
  if (!config) throw new Error("No Google Sheet linked yet.");

  const [tasksRows, litigesRows, achatsRows] = await Promise.all([
    getSheetValues(config.spreadsheetId, TASKS_TAB),
    getSheetValues(config.spreadsheetId, LITIGES_TAB),
    getSheetValues(config.spreadsheetId, ACHATS_TAB),
  ]);

  const failed: RestoreFailure[] = [];
  const taskRecords = [...parseBackupRows<TaskBackupRecord>(tasksRows, failed), ...parseBackupRows<TaskBackupRecord>(litigesRows, failed)];
  const purchaseRecords = parseBackupRows<PurchaseBackupRecord>(achatsRows, failed);

  const [existingTasks, existingProjects] = await Promise.all([db.task.findMany({ select: { id: true } }), db.project.findMany({ select: { id: true } })]);
  const existingProjectIds = new Set(existingProjects.map((p) => p.id));
  const restoredIds = new Set(existingTasks.map((t) => t.id));

  let remaining = taskRecords.filter((r) => !restoredIds.has(r.id));
  let tasksRestored = 0;
  let litigesRestored = 0;
  let progress = true;

  while (remaining.length > 0 && progress) {
    progress = false;
    const stillRemaining: TaskBackupRecord[] = [];
    for (const rec of remaining) {
      if (rec.parentId && !restoredIds.has(rec.parentId)) {
        stillRemaining.push(rec);
        continue;
      }
      try {
        await db.task.create({
          data: {
            id: rec.id,
            module: rec.module as TaskModule,
            title: rec.title,
            description: rec.description,
            status: rec.status,
            priority: rec.priority,
            assigneeIds: rec.assigneeIds,
            teamIds: rec.teamIds,
            excludedUserIds: rec.excludedUserIds,
            startDate: rec.startDate ? new Date(rec.startDate) : null,
            dueDate: rec.dueDate ? new Date(rec.dueDate) : null,
            recurrence: rec.recurrence as Prisma.InputJsonValue,
            order: rec.order,
            customValues: rec.customValues as Prisma.InputJsonValue,
            parentId: rec.parentId,
            // A deleted project falls back to unlinked rather than failing the whole restore — mirrors Task.project's onDelete: SetNull.
            projectId: rec.projectId && existingProjectIds.has(rec.projectId) ? rec.projectId : null,
            createdAt: new Date(rec.createdAt),
            updatedAt: new Date(rec.updatedAt),
          },
        });
        restoredIds.add(rec.id);
        if (rec.module === "dispute") litigesRestored++;
        else tasksRestored++;
        progress = true;
      } catch (err) {
        failed.push({ id: rec.id, title: rec.title, reason: err instanceof Error ? err.message : "Failed to recreate." });
      }
    }
    remaining = stillRemaining;
  }
  for (const rec of remaining) {
    failed.push({ id: rec.id, title: rec.title, reason: "Its parent task is missing and can't be recreated." });
  }

  const existingPurchaseIds = new Set((await db.purchaseItem.findMany({ select: { id: true } })).map((p) => p.id));
  let achatsRestored = 0;
  for (const rec of purchaseRecords) {
    if (existingPurchaseIds.has(rec.id)) continue;
    try {
      await db.purchaseItem.create({
        data: {
          id: rec.id,
          order: rec.order,
          values: rec.values as Prisma.InputJsonValue,
          assigneeIds: rec.assigneeIds,
          excludedUserIds: rec.excludedUserIds,
          createdAt: new Date(rec.createdAt),
          updatedAt: new Date(rec.updatedAt),
        },
      });
      achatsRestored++;
    } catch (err) {
      failed.push({ id: rec.id, title: rec.id, reason: err instanceof Error ? err.message : "Failed to recreate." });
    }
  }

  return { tasksRestored, litigesRestored, achatsRestored, failed };
}
