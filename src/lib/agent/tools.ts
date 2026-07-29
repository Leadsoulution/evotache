import { db } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import { isOverdue } from "@/lib/date";
import { notifyUser } from "@/lib/notify";
import { emailUser } from "@/lib/email";
import type { AgentTool } from "@/types/agent";

export interface ToolContext {
  agentId: string;
  agentName: string;
  enabledTools: AgentTool[];
}

export interface ToolDef {
  name: string;
  /** Tool is offered to the LLM if the agent has ANY of these enabled; some tools do a stricter runtime check inside execute(). */
  requires: AgentTool[];
  description: string;
  parameters: Record<string, unknown>;
  execute: (args: Record<string, unknown>, ctx: ToolContext) => Promise<unknown>;
}

export async function logAgentAction(ctx: ToolContext, type: string, summary: string, payload: unknown, success: boolean, error?: string): Promise<void> {
  await db.agentActionLog.create({
    data: {
      agentId: ctx.agentId,
      type,
      summary,
      payload: payload as unknown as Prisma.InputJsonValue,
      success,
      error,
    },
  });
}

function assertModuleAllowed(module: "task" | "dispute", ctx: ToolContext): void {
  const required: AgentTool = module === "dispute" ? "litiges" : "tasks";
  if (!ctx.enabledTools.includes(required)) throw new Error(`This agent is not allowed to act on ${module === "dispute" ? "litiges" : "tasks"}.`);
}

async function doneStatusId(): Promise<string | null> {
  const statuses = await db.statusDef.findMany({ orderBy: { order: "asc" } });
  return statuses[statuses.length - 1]?.id ?? null;
}

const listOverdueItems: ToolDef = {
  name: "list_overdue_items",
  requires: ["tasks", "litiges"],
  description: "List overdue tasks or litiges (past their due date, not yet in the final/done status), with their assignees.",
  parameters: {
    type: "object",
    properties: { module: { type: "string", enum: ["task", "dispute"], description: "\"task\" for Tasks, \"dispute\" for Litiges." } },
    required: ["module"],
  },
  execute: async (args, ctx) => {
    const taskModule = args.module as "task" | "dispute";
    assertModuleAllowed(taskModule, ctx);
    const done = await doneStatusId();
    const items = await db.task.findMany({ where: { module: taskModule, dueDate: { not: null }, ...(done && { status: { not: done } }) } });
    const overdue = items.filter((t) => isOverdue(t.dueDate!.toISOString()));
    const userIds = Array.from(new Set(overdue.flatMap((t) => t.assigneeIds)));
    const users = await db.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true } });
    const nameById = new Map(users.map((u) => [u.id, u.name]));
    return overdue.map((t) => ({
      id: t.id,
      title: t.title,
      dueDate: t.dueDate!.toISOString().slice(0, 10),
      priority: t.priority,
      status: t.status,
      assignees: t.assigneeIds.map((id) => nameById.get(id) ?? id),
    }));
  },
};

const getStats: ToolDef = {
  name: "get_stats",
  requires: ["tasks", "litiges"],
  description: "Get counts of tasks/litiges by status, plus overdue count and how many were completed today.",
  parameters: {
    type: "object",
    properties: { module: { type: "string", enum: ["task", "dispute"] } },
    required: ["module"],
  },
  execute: async (args, ctx) => {
    const taskModule = args.module as "task" | "dispute";
    assertModuleAllowed(taskModule, ctx);
    const [statuses, items] = await Promise.all([db.statusDef.findMany({ orderBy: { order: "asc" } }), db.task.findMany({ where: { module: taskModule } })]);
    const done = statuses[statuses.length - 1]?.id ?? null;
    const byStatus: Record<string, number> = {};
    for (const status of statuses) byStatus[status.label] = items.filter((t) => t.status === status.id).length;
    const overdueCount = items.filter((t) => t.status !== done && isOverdue(t.dueDate ? t.dueDate.toISOString() : null)).length;
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const completedTodayCount = items.filter((t) => t.status === done && t.updatedAt >= todayStart).length;
    return { total: items.length, byStatus, overdueCount, completedTodayCount };
  },
};

const sendReminder: ToolDef = {
  name: "send_reminder",
  requires: ["tasks", "litiges"],
  description: "Send a reminder (push notification + email) to every assignee of a specific task or litige, identified by its id.",
  parameters: {
    type: "object",
    properties: {
      taskId: { type: "string", description: "The id of the task/litige to remind assignees about." },
      message: { type: "string", description: "Optional custom reminder message; defaults to a generic overdue reminder." },
    },
    required: ["taskId"],
  },
  execute: async (args, ctx) => {
    const taskId = args.taskId as string;
    const message = args.message as string | undefined;
    const task = await db.task.findUnique({ where: { id: taskId } });
    if (!task) throw new Error("Task/litige not found.");
    assertModuleAllowed(task.module, ctx);
    const users = await db.user.findMany({ where: { id: { in: task.assigneeIds } } });
    const url = task.module === "dispute" ? "/disputes" : "/tasks";
    for (const user of users) {
      void notifyUser(user.id, { title: `Reminder from ${ctx.agentName}`, body: message || `"${task.title}" needs your attention.`, url });
      void emailUser(user.email, { subject: `Reminder: ${task.title}`, heading: `Reminder from ${ctx.agentName}`, body: message || `"${task.title}" needs your attention.`, url });
    }
    return { remindedCount: users.length, remindedNames: users.map((u) => u.name) };
  },
};

const listPurchaseItems: ToolDef = {
  name: "list_purchase_items",
  requires: ["achats"],
  description: "List all purchase (Achats) rows with their column values.",
  parameters: { type: "object", properties: {} },
  execute: async () => {
    const [columns, items] = await Promise.all([db.purchaseColumnDef.findMany({ orderBy: { order: "asc" } }), db.purchaseItem.findMany({ orderBy: { order: "asc" } })]);
    const nameById = new Map(columns.map((c) => [c.id, c.name]));
    return items.map((item) => {
      const values = item.values as Record<string, string>;
      const named: Record<string, string> = {};
      for (const [colId, value] of Object.entries(values)) named[nameById.get(colId) ?? colId] = value;
      return { id: item.id, values: named };
    });
  },
};

const createPurchaseItem: ToolDef = {
  name: "create_purchase_item",
  requires: ["achats"],
  description: "Create a new purchase (Achats) row with the given column values (column names must match existing columns from list_purchase_items).",
  parameters: {
    type: "object",
    properties: { values: { type: "object", description: "Map of column name to text value.", additionalProperties: { type: "string" } } },
    required: ["values"],
  },
  execute: async (args) => {
    const values = (args.values ?? {}) as Record<string, string>;
    const columns = await db.purchaseColumnDef.findMany();
    const idByName = new Map(columns.map((c) => [c.name.toLowerCase(), c.id]));
    const mapped: Record<string, string> = {};
    for (const [name, value] of Object.entries(values)) {
      const colId = idByName.get(name.toLowerCase());
      if (colId) mapped[colId] = value;
    }
    const maxOrder = await db.purchaseItem.aggregate({ _max: { order: true } });
    const item = await db.purchaseItem.create({
      data: { order: (maxOrder._max.order ?? -1) + 1, values: mapped as unknown as Prisma.InputJsonValue, assigneeIds: [], excludedUserIds: [] },
    });
    return { id: item.id };
  },
};

const updatePurchaseItem: ToolDef = {
  name: "update_purchase_item",
  requires: ["achats"],
  description: "Update column values on an existing purchase (Achats) row by id.",
  parameters: {
    type: "object",
    properties: {
      id: { type: "string" },
      values: { type: "object", description: "Map of column name to new text value.", additionalProperties: { type: "string" } },
    },
    required: ["id", "values"],
  },
  execute: async (args) => {
    const id = args.id as string;
    const values = (args.values ?? {}) as Record<string, string>;
    const existing = await db.purchaseItem.findUnique({ where: { id } });
    if (!existing) throw new Error("Purchase item not found.");
    const columns = await db.purchaseColumnDef.findMany();
    const idByName = new Map(columns.map((c) => [c.name.toLowerCase(), c.id]));
    const mapped: Record<string, string> = { ...(existing.values as Record<string, string>) };
    for (const [name, value] of Object.entries(values)) {
      const colId = idByName.get(name.toLowerCase());
      if (colId) mapped[colId] = value;
    }
    await db.purchaseItem.update({ where: { id }, data: { values: mapped as unknown as Prisma.InputJsonValue } });
    return { ok: true };
  },
};

export const AGENT_TOOL_DEFS: ToolDef[] = [listOverdueItems, getStats, sendReminder, listPurchaseItems, createPurchaseItem, updatePurchaseItem];
