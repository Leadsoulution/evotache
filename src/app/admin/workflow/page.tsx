import { WorkflowManager } from "@/components/admin/WorkflowManager";

export default function AdminWorkflowPage() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">Statuses & priorities</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Customize the workflow every task moves through.</p>
      </header>
      <WorkflowManager />
    </div>
  );
}
