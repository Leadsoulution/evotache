import { Suspense } from "react";
import { TaskListView } from "@/components/task-list/TaskListView";
import { TaskListSkeleton } from "@/components/task-list/TaskListSkeleton";

export default function DisputesPage() {
  return (
    <Suspense fallback={<div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8"><TaskListSkeleton /></div>}>
      <TaskListView module="dispute" title="Litiges" subtitle="Suivez et gérez les litiges, réclamations et différends en cours." />
    </Suspense>
  );
}
