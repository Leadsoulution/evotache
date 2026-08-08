// Source-of-truth dictionary — fr.ts is typed against these exact keys
// (Record<TranslationKey, string>), so a missing French translation is a
// compile error, not a silently-blank label at runtime.
export const en = {
  // Navigation
  "nav.dashboard": "Dashboard",
  "nav.chat": "Chat",
  "nav.tasks": "Tasks",
  "nav.projects": "Projects",
  "nav.socialMedia": "Social Media",
  "nav.departments": "Departments",
  "nav.litiges": "Litiges",
  "nav.achats": "Achats",
  "nav.overdue": "Overdue",
  "nav.reminders": "Reminders",
  "nav.library": "Library",
  "nav.aiAssistant": "AI Assistant",
  "nav.statistics": "Statistics",
  "nav.calls": "Calls",
  "nav.biometrics": "Biometrics",
  "nav.admin": "Settings",

  // Common
  "common.save": "Save",
  "common.cancel": "Cancel",
  "common.confirm": "Confirm",
  "common.delete": "Delete",
  "common.add": "Add",
  "common.edit": "Edit",

  // Task list toolbar
  "tasks.searchPlaceholder": "Search tasks…",
  "tasks.status": "Status",
  "tasks.priority": "Priority",
  "tasks.assignee": "Assignee",
  "tasks.project": "Project",
  "tasks.department": "Department",
  "tasks.type": "Type",
  "tasks.myTasks": "My Tasks",
  "tasks.showDone": "Show done",
  "tasks.clearFilters": "Clear filters",
  "tasks.group": "Group",
  "tasks.sort": "Sort",
  "tasks.columns": "Columns",

  // Task table columns
  "tasks.col.task": "Task",
  "tasks.col.assignees": "Assignees",
  "tasks.col.department": "Department",
  "tasks.col.dueDate": "Due date",
  "tasks.col.priority": "Priority",
  "tasks.col.status": "Status",

  // Task row/card
  "tasks.noPriority": "No priority",
  "tasks.noDueDate": "No due date",
  "tasks.addTask": "Add task",
  "tasks.dueDatePlaceholder": "Due date",

  // Due date menu shortcuts
  "dueDate.today": "Today",
  "dueDate.tomorrow": "Tomorrow",
  "dueDate.thisWeekend": "This weekend",
  "dueDate.nextWeek": "Next week",
  "dueDate.nextWeekend": "Next weekend",
  "dueDate.twoWeeks": "2 weeks",
  "dueDate.fourWeeks": "4 weeks",
  "dueDate.clear": "Clear",
  "dueDate.startDate": "Start date",
  "dueDate.dueDate": "Due date",
};

export type TranslationKey = keyof typeof en;
