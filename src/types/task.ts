export type TaskStatus = string;

export type TaskPriority = string;

export type TaskModule = "task" | "dispute";

export interface Assignee {
  id: string;
  name: string;
  color: string;
  photoDataUrl: string | null;
}

export type RecurrenceFrequency = "daily" | "weekly" | "monthly";

export interface RecurrenceRule {
  frequency: RecurrenceFrequency;
  /** Repeat every N days/weeks/months, depending on frequency. Always >= 1. */
  interval: number;
  /** Weekly only — 0=Sunday..6=Saturday. Falls back to the due date's weekday when empty. */
  daysOfWeek: number[];
  /** Monthly only — 1-31, clamped to the shorter month. Falls back to the due date's day when null. */
  dayOfMonth: number | null;
}

export type TaskTypeFilter = "mission" | "recurring";

export interface Task {
  id: string;
  module: TaskModule;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeIds: string[];
  teamIds: string[];
  excludedUserIds: string[];
  startDate: string | null;
  dueDate: string | null;
  recurrence: RecurrenceRule | null;
  order: number;
  parentId: string | null;
  projectId: string | null;
  customValues: Record<string, string>;
  createdBy: string | null;
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
  teamIds: string[];
  taskTypes: TaskTypeFilter[];
  myTasksOnly: boolean;
  currentUserId: string;
}
