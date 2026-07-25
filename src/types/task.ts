export type TaskStatus = string;

export type TaskPriority = string;

export type TaskModule = "task" | "dispute";

export interface Assignee {
  id: string;
  name: string;
  color: string;
}

export interface Task {
  id: string;
  module: TaskModule;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeIds: string[];
  dueDate: string | null;
  order: number;
  parentId: string | null;
  projectId: string | null;
  customValues: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}

export type TaskDraft = Partial<Omit<Task, "title">> & Pick<Task, "title">;

export type SortField = "manual" | "title" | "status" | "priority" | "dueDate" | "createdAt";

export type SortDirection = "asc" | "desc";

export type GroupField = "none" | "status" | "priority" | "assignee";

export interface TaskFilters {
  search: string;
  statuses: TaskStatus[];
  priorities: TaskPriority[];
  assigneeIds: string[];
  projectIds: string[];
}
