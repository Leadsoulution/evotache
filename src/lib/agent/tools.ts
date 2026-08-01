import { db } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import { isOverdue, fromDateInputValue } from "@/lib/date";
import { notifyUser } from "@/lib/notify";
import { emailUser } from "@/lib/email";
import { toPublicTask } from "@/lib/publicTask";
import { getDescendantIds } from "@/lib/taskTree";
import { deleteFile } from "@/lib/storage";
import { listDriveFiles, listRecentGmail, readDriveFile, sendGmail } from "@/lib/googleApi";
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

/** Fuzzy case-insensitive name -> id resolution for secondary references
 * (assignees, department members). Deliberately forgiving here — the worst
 * case for a wrong secondary reference (e.g. wrong assignee) is much milder
 * than for a wrong primary mutation target, which every new tool below
 * requires an exact id for instead. */
async function resolveUserIds(names: unknown): Promise<string[]> {
  if (!Array.isArray(names) || names.length === 0) return [];
  const users = await db.user.findMany({ where: { status: "active" } });
  return (names as string[])
    .map((name) => users.find((u) => u.name.toLowerCase().includes(name.trim().toLowerCase())))
    .filter((u): u is NonNullable<typeof u> => Boolean(u))
    .map((u) => u.id);
}

async function resolveTeamIds(names: unknown): Promise<string[]> {
  if (!Array.isArray(names) || names.length === 0) return [];
  const teams = await db.team.findMany();
  return (names as string[])
    .map((name) => teams.find((t) => t.name.toLowerCase().includes(name.trim().toLowerCase())))
    .filter((t): t is NonNullable<typeof t> => Boolean(t))
    .map((t) => t.id);
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

const readLibrary: ToolDef = {
  name: "read_library",
  requires: ["library"],
  description: "Read the company's library documents (working hours, policies, and other rules/reference material). Returns every document's title and full content.",
  parameters: { type: "object", properties: {} },
  execute: async () => {
    const docs = await db.libraryDoc.findMany({ orderBy: { order: "asc" } });
    return docs.map((doc) => ({ title: doc.title, content: doc.content }));
  },
};

const createTask: ToolDef = {
  name: "create_task",
  requires: ["tasks", "litiges"],
  description:
    "Create a new task or litige. Always tell the user it was created only after this tool actually returns successfully — never claim success without calling it.",
  parameters: {
    type: "object",
    properties: {
      module: { type: "string", enum: ["task", "dispute"], description: "\"task\" for Tasks, \"dispute\" for Litiges." },
      title: { type: "string" },
      description: { type: "string", description: "Optional longer description." },
      priority: { type: "string", description: "Priority label matching an existing priority (e.g. \"Urgent\", \"High\", \"Normal\", \"Low\"). Omit for the default." },
      dueDate: { type: "string", description: "Optional due date as YYYY-MM-DD." },
      assigneeNames: { type: "array", items: { type: "string" }, description: "Optional names of users to assign (matched case-insensitively)." },
    },
    required: ["module", "title"],
  },
  execute: async (args, ctx) => {
    const taskModule = args.module as "task" | "dispute";
    assertModuleAllowed(taskModule, ctx);
    const title = (args.title as string | undefined)?.trim();
    if (!title) throw new Error("A title is required.");

    const statuses = await db.statusDef.findMany({ orderBy: { order: "asc" } });
    const firstStatusId = statuses[0]?.id;
    if (!firstStatusId) throw new Error("No statuses are configured yet.");

    const priorities = await db.priorityDef.findMany({ orderBy: { order: "asc" } });
    const requestedPriority = (args.priority as string | undefined)?.trim().toLowerCase();
    const matchedPriority = requestedPriority ? priorities.find((p) => p.label.toLowerCase() === requestedPriority) : undefined;
    const priorityId = matchedPriority?.id ?? priorities[priorities.length - 1]?.id ?? "none";

    const assigneeIds = await resolveUserIds(args.assigneeNames);

    const dueDateInput = args.dueDate as string | undefined;
    const maxOrder = await db.task.aggregate({ where: { module: taskModule }, _max: { order: true } });
    const task = await db.task.create({
      data: {
        module: taskModule,
        title,
        description: (args.description as string | undefined) ?? "",
        status: firstStatusId,
        priority: priorityId,
        assigneeIds,
        dueDate: dueDateInput ? fromDateInputValue(dueDateInput) : null,
        order: (maxOrder._max.order ?? -1) + 1,
      },
    });
    return { id: task.id, title: task.title, module: taskModule, assignedCount: assigneeIds.length };
  },
};

const listTasks: ToolDef = {
  name: "list_tasks",
  requires: ["tasks", "litiges"],
  description: "List tasks or litiges, optionally filtered by status and/or a title search. Use this to find a task's id before calling update_task or delete_task.",
  parameters: {
    type: "object",
    properties: {
      module: { type: "string", enum: ["task", "dispute"], description: "\"task\" for Tasks, \"dispute\" for Litiges." },
      status: { type: "string", description: "Optional status label to filter by (e.g. \"To Do\", \"Done\")." },
      search: { type: "string", description: "Optional case-insensitive text to search for in the title." },
    },
    required: ["module"],
  },
  execute: async (args, ctx) => {
    const taskModule = args.module as "task" | "dispute";
    assertModuleAllowed(taskModule, ctx);
    const statuses = await db.statusDef.findMany({ orderBy: { order: "asc" } });
    const statusLabel = (args.status as string | undefined)?.trim().toLowerCase();
    const statusId = statusLabel ? statuses.find((s) => s.label.toLowerCase() === statusLabel)?.id : undefined;
    const search = (args.search as string | undefined)?.trim().toLowerCase();

    const items = await db.task.findMany({ where: { module: taskModule, ...(statusId && { status: statusId }) } });
    const filtered = search ? items.filter((t) => t.title.toLowerCase().includes(search)) : items;
    const userIds = Array.from(new Set(filtered.flatMap((t) => t.assigneeIds)));
    const users = await db.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true } });
    const nameById = new Map(users.map((u) => [u.id, u.name]));
    const statusLabelById = new Map(statuses.map((s) => [s.id, s.label]));

    return filtered.map((t) => ({
      id: t.id,
      title: t.title,
      status: statusLabelById.get(t.status) ?? t.status,
      priority: t.priority,
      dueDate: t.dueDate ? t.dueDate.toISOString().slice(0, 10) : null,
      assignees: t.assigneeIds.map((id) => nameById.get(id) ?? id),
    }));
  },
};

const updateTask: ToolDef = {
  name: "update_task",
  requires: ["tasks", "litiges"],
  description: "Update an existing task or litige by id (find the id with list_tasks first). Only the fields provided are changed.",
  parameters: {
    type: "object",
    properties: {
      id: { type: "string" },
      title: { type: "string" },
      description: { type: "string" },
      status: { type: "string", description: "Status label matching an existing status (e.g. \"To Do\", \"Done\")." },
      priority: { type: "string", description: "Priority label matching an existing priority." },
      dueDate: { type: "string", description: "New due date as YYYY-MM-DD, or an empty string to clear it." },
      assigneeNames: { type: "array", items: { type: "string" }, description: "Replaces the full assignee list (matched case-insensitively)." },
    },
    required: ["id"],
  },
  execute: async (args, ctx) => {
    const id = args.id as string;
    const existing = await db.task.findUnique({ where: { id } });
    if (!existing) throw new Error("Task/litige not found.");
    assertModuleAllowed(existing.module, ctx);

    const data: Prisma.TaskUpdateInput = {};
    if (typeof args.title === "string" && args.title.trim()) data.title = args.title.trim();
    if (typeof args.description === "string") data.description = args.description;

    if (typeof args.status === "string") {
      const statusArg = args.status.trim().toLowerCase();
      const statuses = await db.statusDef.findMany();
      const match = statuses.find((s) => s.label.toLowerCase() === statusArg);
      if (!match) throw new Error(`No status named "${args.status}".`);
      data.status = match.id;
    }
    if (typeof args.priority === "string") {
      const priorityArg = args.priority.trim().toLowerCase();
      const priorities = await db.priorityDef.findMany();
      const match = priorities.find((p) => p.label.toLowerCase() === priorityArg);
      if (!match) throw new Error(`No priority named "${args.priority}".`);
      data.priority = match.id;
    }
    if (typeof args.dueDate === "string") data.dueDate = args.dueDate ? fromDateInputValue(args.dueDate) : null;
    if (args.assigneeNames !== undefined) data.assigneeIds = await resolveUserIds(args.assigneeNames);

    const task = await db.task.update({ where: { id }, data });
    return { id: task.id, title: task.title };
  },
};

const deleteTask: ToolDef = {
  name: "delete_task",
  requires: ["tasks", "litiges"],
  description: "Permanently delete a task or litige by id (find the id with list_tasks first), including all of its subtasks and attachments. This cannot be undone.",
  parameters: {
    type: "object",
    properties: { id: { type: "string" } },
    required: ["id"],
  },
  execute: async (args, ctx) => {
    const id = args.id as string;
    const existing = await db.task.findUnique({ where: { id } });
    if (!existing) throw new Error("Task/litige not found.");
    assertModuleAllowed(existing.module, ctx);

    // Same cleanup as src/app/api/tasks/bulk-delete/route.ts: Attachment has
    // no FK relation to Task, so it isn't covered by Task.parent's cascade.
    const allTasks = (await db.task.findMany()).map(toPublicTask);
    const descendantIds = getDescendantIds(allTasks, id);
    const allIdsToDelete = [id, ...descendantIds];
    const attachments = await db.attachment.findMany({ where: { taskId: { in: allIdsToDelete } } });
    await db.attachment.deleteMany({ where: { taskId: { in: allIdsToDelete } } });
    for (const attachment of attachments) {
      if (attachment.url) void deleteFile(attachment.url);
    }
    await db.task.delete({ where: { id } }); // cascades descendant Task rows
    return { deletedId: id, deletedCount: allIdsToDelete.length };
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

const deletePurchaseItem: ToolDef = {
  name: "delete_purchase_item",
  requires: ["achats"],
  description: "Permanently delete a purchase (Achats) row by id (find the id with list_purchase_items first). This cannot be undone.",
  parameters: {
    type: "object",
    properties: { id: { type: "string" } },
    required: ["id"],
  },
  execute: async (args) => {
    const id = args.id as string;
    const existing = await db.purchaseItem.findUnique({ where: { id } });
    if (!existing) throw new Error("Purchase item not found.");
    await db.purchaseItem.delete({ where: { id } });
    return { deletedId: id };
  },
};

const listProjects: ToolDef = {
  name: "list_projects",
  requires: ["projects"],
  description: "List all projects with their department names and excluded users.",
  parameters: { type: "object", properties: {} },
  execute: async () => {
    const [projects, teams, users] = await Promise.all([db.project.findMany(), db.team.findMany(), db.user.findMany()]);
    const teamNameById = new Map(teams.map((t) => [t.id, t.name]));
    const userNameById = new Map(users.map((u) => [u.id, u.name]));
    return projects.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      departments: p.teamIds.map((id) => teamNameById.get(id) ?? id),
      excludedUsers: p.excludedUserIds.map((id) => userNameById.get(id) ?? id),
    }));
  },
};

const createProject: ToolDef = {
  name: "create_project",
  requires: ["projects"],
  description: "Create a new project.",
  parameters: {
    type: "object",
    properties: {
      name: { type: "string" },
      description: { type: "string" },
      color: { type: "string", description: "Optional hex color, e.g. \"#6366f1\". A random one is used if omitted." },
      departmentNames: { type: "array", items: { type: "string" }, description: "Optional department names to associate (matched case-insensitively)." },
    },
    required: ["name"],
  },
  execute: async (args) => {
    const name = (args.name as string | undefined)?.trim();
    if (!name) throw new Error("A name is required.");
    const teamIds = await resolveTeamIds(args.departmentNames);
    const project = await db.project.create({
      data: {
        name,
        description: (args.description as string | undefined) ?? "",
        color: (args.color as string | undefined) ?? "#6366f1",
        teamIds,
      },
    });
    return { id: project.id, name: project.name };
  },
};

const updateProject: ToolDef = {
  name: "update_project",
  requires: ["projects"],
  description: "Update an existing project by id (find the id with list_projects first). Only the fields provided are changed.",
  parameters: {
    type: "object",
    properties: {
      id: { type: "string" },
      name: { type: "string" },
      description: { type: "string" },
      color: { type: "string" },
      departmentNames: { type: "array", items: { type: "string" }, description: "Replaces the full department list." },
    },
    required: ["id"],
  },
  execute: async (args) => {
    const id = args.id as string;
    const existing = await db.project.findUnique({ where: { id } });
    if (!existing) throw new Error("Project not found.");
    const data: Prisma.ProjectUpdateInput = {};
    if (typeof args.name === "string" && args.name.trim()) data.name = args.name.trim();
    if (typeof args.description === "string") data.description = args.description;
    if (typeof args.color === "string" && args.color.trim()) data.color = args.color.trim();
    if (args.departmentNames !== undefined) data.teamIds = await resolveTeamIds(args.departmentNames);
    const project = await db.project.update({ where: { id }, data });
    return { id: project.id, name: project.name };
  },
};

const deleteProject: ToolDef = {
  name: "delete_project",
  requires: ["projects"],
  description: "Permanently delete a project by id (find the id with list_projects first). Its tasks are kept but unlinked from the project. This cannot be undone.",
  parameters: {
    type: "object",
    properties: { id: { type: "string" } },
    required: ["id"],
  },
  execute: async (args) => {
    const id = args.id as string;
    const existing = await db.project.findUnique({ where: { id } });
    if (!existing) throw new Error("Project not found.");
    await db.project.delete({ where: { id } });
    return { deletedId: id };
  },
};

const listDepartments: ToolDef = {
  name: "list_departments",
  requires: ["teams"],
  description: "List all departments with their member names.",
  parameters: { type: "object", properties: {} },
  execute: async () => {
    const [teams, users] = await Promise.all([db.team.findMany(), db.user.findMany()]);
    const nameById = new Map(users.map((u) => [u.id, u.name]));
    return teams.map((t) => ({ id: t.id, name: t.name, members: t.memberIds.map((id) => nameById.get(id) ?? id) }));
  },
};

const createDepartment: ToolDef = {
  name: "create_department",
  requires: ["teams"],
  description: "Create a new department.",
  parameters: {
    type: "object",
    properties: {
      name: { type: "string" },
      color: { type: "string", description: "Optional hex color, e.g. \"#6366f1\". A random one is used if omitted." },
      memberNames: { type: "array", items: { type: "string" }, description: "Optional member names (matched case-insensitively)." },
    },
    required: ["name"],
  },
  execute: async (args) => {
    const name = (args.name as string | undefined)?.trim();
    if (!name) throw new Error("A name is required.");
    const memberIds = await resolveUserIds(args.memberNames);
    const team = await db.team.create({ data: { name, color: (args.color as string | undefined) ?? "#6366f1", memberIds } });
    return { id: team.id, name: team.name };
  },
};

const updateDepartment: ToolDef = {
  name: "update_department",
  requires: ["teams"],
  description: "Rename or recolor an existing department by id (find the id with list_departments first). Use add_department_member / remove_department_member to change membership.",
  parameters: {
    type: "object",
    properties: {
      id: { type: "string" },
      name: { type: "string" },
      color: { type: "string" },
    },
    required: ["id"],
  },
  execute: async (args) => {
    const id = args.id as string;
    const existing = await db.team.findUnique({ where: { id } });
    if (!existing) throw new Error("Department not found.");
    const data: Prisma.TeamUpdateInput = {};
    if (typeof args.name === "string" && args.name.trim()) data.name = args.name.trim();
    if (typeof args.color === "string" && args.color.trim()) data.color = args.color.trim();
    const team = await db.team.update({ where: { id }, data });
    return { id: team.id, name: team.name };
  },
};

const addDepartmentMember: ToolDef = {
  name: "add_department_member",
  requires: ["teams"],
  description: "Add one or more users to a department by id (find the id with list_departments first).",
  parameters: {
    type: "object",
    properties: {
      id: { type: "string" },
      userNames: { type: "array", items: { type: "string" }, description: "Names of users to add (matched case-insensitively)." },
    },
    required: ["id", "userNames"],
  },
  execute: async (args) => {
    const id = args.id as string;
    const existing = await db.team.findUnique({ where: { id } });
    if (!existing) throw new Error("Department not found.");
    const toAdd = await resolveUserIds(args.userNames);
    const memberIds = Array.from(new Set([...existing.memberIds, ...toAdd]));
    await db.team.update({ where: { id }, data: { memberIds } });
    return { id, memberCount: memberIds.length };
  },
};

const removeDepartmentMember: ToolDef = {
  name: "remove_department_member",
  requires: ["teams"],
  description: "Remove one or more users from a department by id (find the id with list_departments first).",
  parameters: {
    type: "object",
    properties: {
      id: { type: "string" },
      userNames: { type: "array", items: { type: "string" }, description: "Names of users to remove (matched case-insensitively)." },
    },
    required: ["id", "userNames"],
  },
  execute: async (args) => {
    const id = args.id as string;
    const existing = await db.team.findUnique({ where: { id } });
    if (!existing) throw new Error("Department not found.");
    const toRemove = new Set(await resolveUserIds(args.userNames));
    const memberIds = existing.memberIds.filter((memberId) => !toRemove.has(memberId));
    await db.team.update({ where: { id }, data: { memberIds } });
    return { id, memberCount: memberIds.length };
  },
};

const deleteDepartment: ToolDef = {
  name: "delete_department",
  requires: ["teams"],
  description: "Permanently delete a department by id (find the id with list_departments first). This cannot be undone.",
  parameters: {
    type: "object",
    properties: { id: { type: "string" } },
    required: ["id"],
  },
  execute: async (args) => {
    const id = args.id as string;
    const existing = await db.team.findUnique({ where: { id } });
    if (!existing) throw new Error("Department not found.");
    await db.team.delete({ where: { id } });
    return { deletedId: id };
  },
};

const createLibraryDoc: ToolDef = {
  name: "create_library_doc",
  requires: ["library"],
  description: "Create a new library document (company rule/policy/reference page).",
  parameters: {
    type: "object",
    properties: {
      title: { type: "string" },
      content: { type: "string", description: "Markdown content." },
    },
    required: ["title"],
  },
  execute: async (args) => {
    const title = (args.title as string | undefined)?.trim();
    if (!title) throw new Error("A title is required.");
    const order = await db.libraryDoc.count();
    const doc = await db.libraryDoc.create({ data: { title, content: (args.content as string | undefined) ?? "", order } });
    return { id: doc.id, title: doc.title };
  },
};

const updateLibraryDoc: ToolDef = {
  name: "update_library_doc",
  requires: ["library"],
  description: "Update an existing library document's title or content by id (find the id via read_library first).",
  parameters: {
    type: "object",
    properties: {
      id: { type: "string" },
      title: { type: "string" },
      content: { type: "string" },
    },
    required: ["id"],
  },
  execute: async (args) => {
    const id = args.id as string;
    const existing = await db.libraryDoc.findUnique({ where: { id } });
    if (!existing) throw new Error("Library document not found.");
    const data: Prisma.LibraryDocUpdateInput = {};
    if (typeof args.title === "string" && args.title.trim()) data.title = args.title.trim();
    if (typeof args.content === "string") data.content = args.content;
    const doc = await db.libraryDoc.update({ where: { id }, data });
    return { id: doc.id, title: doc.title };
  },
};

const deleteLibraryDoc: ToolDef = {
  name: "delete_library_doc",
  requires: ["library"],
  description: "Permanently delete a library document by id (find the id via read_library first). This cannot be undone.",
  parameters: {
    type: "object",
    properties: { id: { type: "string" } },
    required: ["id"],
  },
  execute: async (args) => {
    const id = args.id as string;
    const existing = await db.libraryDoc.findUnique({ where: { id } });
    if (!existing) throw new Error("Library document not found.");
    await db.libraryDoc.delete({ where: { id } });
    // Matches src/app/api/library/[id]/route.ts: keep remaining docs' order contiguous.
    const remaining = await db.libraryDoc.findMany({ orderBy: { order: "asc" } });
    await Promise.all(remaining.map((doc, index) => (doc.order === index ? null : db.libraryDoc.update({ where: { id: doc.id }, data: { order: index } }))));
    return { deletedId: id };
  },
};

const listReminderRules: ToolDef = {
  name: "list_reminder_rules",
  requires: ["reminders"],
  description: "List all scheduled reminder rules (overdue-task escalations and meeting reminders), with their schedule and last-sent time.",
  parameters: { type: "object", properties: {} },
  execute: async () => {
    const rules = await db.reminderRule.findMany({ orderBy: { createdAt: "asc" } });
    return rules.map((r) => ({
      id: r.id,
      name: r.name,
      kind: r.kind,
      enabled: r.enabled,
      timesOfDay: r.timesOfDay,
      meetingAt: r.meetingAt?.toISOString() ?? null,
      minutesBefore: r.minutesBefore,
      lastRunAt: r.lastRunAt?.toISOString() ?? null,
    }));
  },
};

const createReminderRule: ToolDef = {
  name: "create_reminder_rule",
  requires: ["reminders"],
  description:
    'Create a scheduled reminder rule. kind="overdue_escalation" nudges people about their overdue tasks at fixed times every day. kind="meeting" sends a one-time reminder a set number of minutes before a specific date/time. Delivered via push notification and/or a chat message from this agent, depending on the via* flags (both default to true).',
  parameters: {
    type: "object",
    properties: {
      name: { type: "string" },
      kind: { type: "string", enum: ["overdue_escalation", "meeting"] },
      timesOfDay: { type: "array", items: { type: "string" }, description: "overdue_escalation only — 24h \"HH:mm\" local times, e.g. [\"09:00\",\"13:00\",\"17:00\"]." },
      notifyAssignee: { type: "boolean", description: "overdue_escalation only — notify the task's assignee. Defaults to true." },
      notifyManager: { type: "boolean", description: "overdue_escalation only — also notify the assignee's manager(s). Defaults to true." },
      meetingAt: { type: "string", description: "meeting only — ISO datetime of the meeting." },
      minutesBefore: { type: "number", description: "meeting only — how many minutes before meetingAt to send the reminder." },
      wholeTeam: { type: "boolean", description: "meeting only — notify every active user. Defaults to false." },
      audienceNames: { type: "array", items: { type: "string" }, description: "meeting only — people to notify by name, if not wholeTeam." },
      audienceDepartmentNames: { type: "array", items: { type: "string" }, description: "meeting only — departments to notify by name, if not wholeTeam." },
      viaPush: { type: "boolean" },
      viaAgentChat: { type: "boolean" },
    },
    required: ["name", "kind"],
  },
  execute: async (args, ctx) => {
    const name = (args.name as string | undefined)?.trim();
    if (!name) throw new Error("A name is required.");
    const kind = args.kind as string;
    if (kind !== "overdue_escalation" && kind !== "meeting") throw new Error('kind must be "overdue_escalation" or "meeting".');

    const rule = await db.reminderRule.create({
      data: {
        name,
        kind,
        timesOfDay: Array.isArray(args.timesOfDay) ? (args.timesOfDay as string[]) : [],
        notifyAssignee: typeof args.notifyAssignee === "boolean" ? args.notifyAssignee : true,
        notifyManager: typeof args.notifyManager === "boolean" ? args.notifyManager : true,
        meetingAt: typeof args.meetingAt === "string" ? new Date(args.meetingAt) : null,
        minutesBefore: typeof args.minutesBefore === "number" ? args.minutesBefore : null,
        wholeTeam: typeof args.wholeTeam === "boolean" ? args.wholeTeam : false,
        audienceUserIds: await resolveUserIds(args.audienceNames),
        audienceTeamIds: await resolveTeamIds(args.audienceDepartmentNames),
        viaPush: typeof args.viaPush === "boolean" ? args.viaPush : true,
        viaAgentChat: typeof args.viaAgentChat === "boolean" ? args.viaAgentChat : true,
        agentId: ctx.agentId,
        createdBy: ctx.agentId,
      },
    });
    return { id: rule.id, name: rule.name, kind: rule.kind };
  },
};

const updateReminderRule: ToolDef = {
  name: "update_reminder_rule",
  requires: ["reminders"],
  description: "Update an existing reminder rule by id (find the id with list_reminder_rules first). Only the fields provided are changed.",
  parameters: {
    type: "object",
    properties: {
      id: { type: "string" },
      name: { type: "string" },
      enabled: { type: "boolean" },
      timesOfDay: { type: "array", items: { type: "string" } },
      notifyAssignee: { type: "boolean" },
      notifyManager: { type: "boolean" },
      meetingAt: { type: "string" },
      minutesBefore: { type: "number" },
      wholeTeam: { type: "boolean" },
      audienceNames: { type: "array", items: { type: "string" } },
      audienceDepartmentNames: { type: "array", items: { type: "string" } },
      viaPush: { type: "boolean" },
      viaAgentChat: { type: "boolean" },
    },
    required: ["id"],
  },
  execute: async (args) => {
    const id = args.id as string;
    const existing = await db.reminderRule.findUnique({ where: { id } });
    if (!existing) throw new Error("Reminder rule not found.");
    const data: Prisma.ReminderRuleUpdateInput = {};
    if (typeof args.name === "string" && args.name.trim()) data.name = args.name.trim();
    if (typeof args.enabled === "boolean") data.enabled = args.enabled;
    if (Array.isArray(args.timesOfDay)) data.timesOfDay = args.timesOfDay as string[];
    if (typeof args.notifyAssignee === "boolean") data.notifyAssignee = args.notifyAssignee;
    if (typeof args.notifyManager === "boolean") data.notifyManager = args.notifyManager;
    if (typeof args.meetingAt === "string") {
      data.meetingAt = new Date(args.meetingAt);
      data.lastRunAt = null; // rescheduling a meeting means it hasn't "happened" yet
    }
    if (typeof args.minutesBefore === "number") data.minutesBefore = args.minutesBefore;
    if (typeof args.wholeTeam === "boolean") data.wholeTeam = args.wholeTeam;
    if (args.audienceNames !== undefined) data.audienceUserIds = await resolveUserIds(args.audienceNames);
    if (args.audienceDepartmentNames !== undefined) data.audienceTeamIds = await resolveTeamIds(args.audienceDepartmentNames);
    if (typeof args.viaPush === "boolean") data.viaPush = args.viaPush;
    if (typeof args.viaAgentChat === "boolean") data.viaAgentChat = args.viaAgentChat;
    const rule = await db.reminderRule.update({ where: { id }, data });
    return { id: rule.id, name: rule.name };
  },
};

const deleteReminderRule: ToolDef = {
  name: "delete_reminder_rule",
  requires: ["reminders"],
  description: "Permanently delete a reminder rule by id (find the id with list_reminder_rules first). This cannot be undone.",
  parameters: {
    type: "object",
    properties: { id: { type: "string" } },
    required: ["id"],
  },
  execute: async (args) => {
    const id = args.id as string;
    const existing = await db.reminderRule.findUnique({ where: { id } });
    if (!existing) throw new Error("Reminder rule not found.");
    await db.reminderRule.delete({ where: { id } });
    return { deletedId: id };
  },
};

const sendEmailGmail: ToolDef = {
  name: "send_email_gmail",
  requires: ["gmail"],
  description: "Send an email from the connected Gmail account.",
  parameters: {
    type: "object",
    properties: {
      to: { type: "string", description: "Recipient email address." },
      subject: { type: "string" },
      body: { type: "string" },
    },
    required: ["to", "subject", "body"],
  },
  execute: async (args) => {
    const to = (args.to as string | undefined)?.trim();
    const subject = (args.subject as string | undefined)?.trim();
    const body = args.body as string | undefined;
    if (!to || !subject || !body) throw new Error("to, subject, and body are required.");
    const result = await sendGmail(to, subject, body);
    return { sent: true, messageId: result.id };
  },
};

const listRecentEmails: ToolDef = {
  name: "list_recent_emails",
  requires: ["gmail"],
  description: "List recent emails in the connected Gmail inbox, optionally filtered with Gmail search syntax (e.g. \"from:someone@example.com\", \"is:unread\").",
  parameters: {
    type: "object",
    properties: {
      query: { type: "string", description: "Optional Gmail search query." },
      maxResults: { type: "number", description: "Max emails to return (default 10, max 25)." },
    },
  },
  execute: async (args) => {
    const query = args.query as string | undefined;
    const maxResults = typeof args.maxResults === "number" ? args.maxResults : 10;
    return listRecentGmail(query, maxResults);
  },
};

const listDriveFilesTool: ToolDef = {
  name: "list_drive_files",
  requires: ["drive"],
  description: "List files in the connected Google Drive, optionally filtered by a name search.",
  parameters: {
    type: "object",
    properties: { query: { type: "string", description: "Optional text to search for in file names." } },
  },
  execute: async (args) => listDriveFiles(args.query as string | undefined),
};

const readDriveFileTool: ToolDef = {
  name: "read_drive_file",
  requires: ["drive"],
  description: "Read the text content of a Google Drive file by id (find the id with list_drive_files first). Supports Google Docs, Google Sheets, and plain-text files.",
  parameters: {
    type: "object",
    properties: { fileId: { type: "string" } },
    required: ["fileId"],
  },
  execute: async (args) => {
    const fileId = args.fileId as string;
    const content = await readDriveFile(fileId);
    return { content };
  },
};

export const AGENT_TOOL_DEFS: ToolDef[] = [
  listOverdueItems,
  getStats,
  sendReminder,
  createTask,
  listTasks,
  updateTask,
  deleteTask,
  readLibrary,
  createLibraryDoc,
  updateLibraryDoc,
  deleteLibraryDoc,
  listPurchaseItems,
  createPurchaseItem,
  updatePurchaseItem,
  deletePurchaseItem,
  listProjects,
  createProject,
  updateProject,
  deleteProject,
  listDepartments,
  createDepartment,
  updateDepartment,
  addDepartmentMember,
  removeDepartmentMember,
  deleteDepartment,
  listReminderRules,
  createReminderRule,
  updateReminderRule,
  deleteReminderRule,
  sendEmailGmail,
  listRecentEmails,
  listDriveFilesTool,
  readDriveFileTool,
];
