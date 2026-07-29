import type { GroupField } from "@/types/task";
import type { PriorityDef, StatusDef } from "@/types/taskMeta";

/** Status/priority groups carry their own color; other group fields (assignee,
 * project, etc.) have no natural color, so their header stays the default gray. */
export function getGroupColor(groupKey: string, groupField: GroupField, statuses: StatusDef[], priorities: PriorityDef[]): string | null {
  if (groupField === "status") return statuses.find((s) => s.id === groupKey)?.color ?? null;
  if (groupField === "priority") return priorities.find((p) => p.id === groupKey)?.color ?? null;
  return null;
}
