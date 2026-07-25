"use client";

import { useState } from "react";
import { useTasks } from "@/hooks/useTasks";
import { useTaskMeta } from "@/hooks/useTaskMeta";
import { useToast } from "@/components/ui/Toast";
import { AlertTriangleIcon, FlagIcon, SparklesIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";

interface Suggestion {
  title: string;
  description: string;
  priority: string;
  dueInDays: number | null;
}

const EXAMPLE_PROMPTS = [
  "Prepare the launch of our new landing page: design review, copywriting, QA, and a go-live checklist.",
  "Onboard a new client: kickoff call, contract signature, access provisioning, and a welcome email.",
  "Plan next week's product release: changelog, regression testing, staging deploy, and announcement.",
];

export function AssistantView() {
  const { priorities } = useTaskMeta();
  const { createTask } = useTasks("task");
  const toast = useToast();

  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [creating, setCreating] = useState(false);

  async function handleGenerate() {
    const trimmed = prompt.trim();
    if (!trimmed) return;
    setLoading(true);
    setError(null);
    setSuggestions([]);
    try {
      const response = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: trimmed }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "Something went wrong.");
        return;
      }
      const list: Suggestion[] = data.tasks ?? [];
      setSuggestions(list);
      setSelected(new Set(list.map((_, index) => index)));
    } catch {
      setError("Could not reach the assistant. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  function toggleSelected(index: number) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

  function resolvePriorityId(label: string): string | undefined {
    const match = priorities.find((p) => p.id === label || p.label.toLowerCase() === label.toLowerCase());
    return match?.id;
  }

  function resolveDueDate(dueInDays: number | null): string | null {
    if (dueInDays === null) return null;
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() + dueInDays);
    return date.toISOString();
  }

  async function handleCreateSelected() {
    const toCreate = suggestions.filter((_, index) => selected.has(index));
    if (toCreate.length === 0) return;
    setCreating(true);
    await Promise.all(
      toCreate.map((suggestion) =>
        createTask(suggestion.title, {
          description: suggestion.description,
          priority: resolvePriorityId(suggestion.priority),
          dueDate: resolveDueDate(suggestion.dueInDays),
        })
      )
    );
    setCreating(false);
    toast.success(`${toCreate.length} task${toCreate.length > 1 ? "s" : ""} created.`);
    setSuggestions([]);
    setPrompt("");
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-1">
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
          <SparklesIcon className="h-6 w-6 text-indigo-500" />
          AI Assistant
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Describe what needs to get done in plain language — the assistant will draft a task list you can review and create.
        </p>
      </header>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <textarea
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          rows={4}
          placeholder="e.g. Plan the migration of our database to the new provider, including backups, a rollback plan, and stakeholder communication."
          className="w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-indigo-950"
        />

        <div className="mt-2 flex flex-wrap gap-1.5">
          {EXAMPLE_PROMPTS.map((example) => (
            <button
              key={example}
              type="button"
              onClick={() => setPrompt(example)}
              className="rounded-full border border-slate-200 px-2.5 py-1 text-xs text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
            >
              {example.length > 48 ? `${example.slice(0, 48)}…` : example}
            </button>
          ))}
        </div>

        <div className="mt-3 flex justify-end">
          <button
            type="button"
            onClick={handleGenerate}
            disabled={loading || !prompt.trim()}
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <SparklesIcon className="h-4 w-4" />
            {loading ? "Generating…" : "Generate tasks"}
          </button>
        </div>
      </div>

      {error && (
        <div role="alert" className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          <AlertTriangleIcon className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {suggestions.length > 0 && (
        <div className="flex flex-col gap-3">
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            {suggestions.map((suggestion, index) => (
              <label
                key={index}
                className={cn(
                  "flex cursor-pointer items-start gap-3 border-b border-slate-100 px-4 py-3 last:border-0 dark:border-slate-800",
                  !selected.has(index) && "opacity-50"
                )}
              >
                <input
                  type="checkbox"
                  checked={selected.has(index)}
                  onChange={() => toggleSelected(index)}
                  className="mt-1 h-4 w-4 shrink-0 rounded border-slate-300 text-indigo-600 dark:border-slate-600 dark:bg-slate-800"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{suggestion.title}</p>
                  {suggestion.description && <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{suggestion.description}</p>}
                  <div className="mt-1.5 flex items-center gap-3 text-xs text-slate-400">
                    <span className="inline-flex items-center gap-1">
                      <FlagIcon className="h-3 w-3" />
                      {suggestion.priority}
                    </span>
                    {suggestion.dueInDays !== null && <span>Due in {suggestion.dueInDays}d</span>}
                  </div>
                </div>
              </label>
            ))}
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleCreateSelected}
              disabled={creating || selected.size === 0}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {creating ? "Creating…" : `Create ${selected.size} task${selected.size === 1 ? "" : "s"}`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
