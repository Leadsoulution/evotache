import { AlertTriangleIcon } from "@/components/ui/icons";

interface ErrorStateProps {
  message: string;
  onRetry: () => void;
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div role="alert" className="flex flex-col items-center justify-center gap-3 rounded-xl border border-red-200 bg-red-50 px-6 py-16 text-center dark:border-red-900 dark:bg-red-950">
      <AlertTriangleIcon className="h-10 w-10 text-red-400" />
      <div>
        <p className="text-sm font-medium text-red-700 dark:text-red-300">Couldn&apos;t load tasks</p>
        <p className="mt-1 text-sm text-red-500 dark:text-red-400">{message}</p>
      </div>
      <button
        type="button"
        onClick={onRetry}
        className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
      >
        Try again
      </button>
    </div>
  );
}
