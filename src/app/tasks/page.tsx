import { Suspense } from "react";
import { TaskListView } from "@/components/task-list/TaskListView";
import { TaskListSkeleton } from "@/components/task-list/TaskListSkeleton";

export default function TasksPage() {
  return (
    <Suspense fallback={<div className="mx-auto w-full max-w-[95%] px-4 py-8 sm:px-6 lg:px-8"><TaskListSkeleton /></div>}>
      <TaskListView module="task" title="Tasks" subtitle="Filter, sort, group, and manage tasks with optimistic updates." />
    </Suspense>
  );
}
