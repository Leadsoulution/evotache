"use client";

import { useEffect, useState } from "react";
import { useTasks } from "@/hooks/useTasks";
import { useTaskMeta } from "@/hooks/useTaskMeta";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { useToast } from "@/components/ui/Toast";
import { countByPriority, countByStatus } from "@/lib/taskStats";
import { isOverdue } from "@/lib/date";
import { AlertTriangleIcon, FlagIcon, MicIcon, SparklesIcon, StopCircleIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import type { TaskModule } from "@/types/task";

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

const MODULE_OPTIONS: { value: TaskModule; label: string }[] = [
  { value: "task", label: "Tasks" },
  { value: "dispute", label: "Litiges" },
];

const TAB_OPTIONS: { value: "generate" | "analyze"; label: string }[] = [
  { value: "generate", label: "Generate" },
  { value: "analyze", label: "Analyze" },
];

interface VoiceTextareaProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  rows?: number;
}

function VoiceTextarea({ value, onChange, placeholder, rows = 4 }: VoiceTextareaProps) {
  const toast = useToast();
  const recorder = useAudioRecorder((text) => onChange(value ? `${value} ${text}` : text));

  function handleMicClick() {
    if (recorder.state === "recording") recorder.stop();
    else if (recorder.state === "idle") recorder.start();
  }

  // Surface once per failure via toast instead of a persistent inline banner.
  useEffect(() => {
    if (recorder.error) toast.error(recorder.error);
  }, [recorder.error, toast]);

  return (
    <div className="relative">
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={rows}
        placeholder={placeholder}
        className="w-full resize-none rounded-lg border border-slate-200 bg-white py-2 pl-3 pr-11 text-sm text-slate-900 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-indigo-950"
      />
      <button
        type="button"
        onClick={handleMicClick}
        disabled={recorder.state === "transcribing"}
        aria-label={recorder.state === "recording" ? "Stop recording" : "Record voice prompt"}
        title={recorder.state === "recording" ? "Stop recording" : "Record voice prompt"}
        className={cn(
          "absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-md",
          recorder.state === "recording"
            ? "animate-pulse bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400"
            : "text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800",
          recorder.state === "transcribing" && "cursor-not-allowed opacity-60"
        )}
      >
        {recorder.state === "recording" ? <StopCircleIcon className="h-4 w-4" /> : <MicIcon className="h-4 w-4" />}
      </button>
      {recorder.state === "transcribing" && <p className="mt-1 text-xs text-slate-400">Transcribing…</p>}
    </div>
  );
}

export function AssistantView() {
  const [tab, setTab] = useState<"generate" | "analyze">("generate");
  const [module, setModule] = useState<TaskModule>("task");
  const { priorities, statuses } = useTaskMeta();
  const { tasks, createTask } = useTasks(module);
  const toast = useToast();

  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [creating, setCreating] = useState(false);

  const [question, setQuestion] = useState("");
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);

  const moduleLabel = module === "dispute" ? "litiges" : "tasks";
  const moduleLabelSingular = module === "dispute" ? "litige" : "task";

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
        body: JSON.stringify({ mode: "generate", module, prompt: trimmed }),
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

  async function handleAnalyze() {
    setAnalyzing(true);
    setAnalyzeError(null);
    setAnalysis(null);
    const overdueCount = tasks.filter((t) => t.status !== statuses[statuses.length - 1]?.id && isOverdue(t.dueDate)).length;
    const unassignedCount = tasks.filter((t) => t.assigneeIds.length === 0).length;
    const context = {
      total: tasks.length,
      byStatus: countByStatus(tasks, statuses).map((d) => ({ label: d.label, value: d.value })),
      byPriority: countByPriority(tasks, priorities).map((d) => ({ label: d.label, value: d.value })),
      overdueCount,
      unassignedCount,
    };
    try {
      const response = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "analyze", module, prompt: question.trim(), context }),
      });
      const data = await response.json();
      if (!response.ok) {
        setAnalyzeError(data.error ?? "Something went wrong.");
        return;
      }
      setAnalysis(data.analysis || "No analysis returned.");
    } catch {
      setAnalyzeError("Could not reach the assistant. Check your connection and try again.");
    } finally {
      setAnalyzing(false);
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
    toast.success(`${toCreate.length} ${toCreate.length === 1 ? moduleLabelSingular : moduleLabel} created.`);
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
        <p className="text-sm text-slate-500 dark:text-slate-400">Generate tasks or litiges from a prompt (typed or spoken), or ask for an analysis of what&apos;s going on.</p>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 rounded-lg border border-slate-200 p-0.5 dark:border-slate-700">
          {TAB_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setTab(option.value)}
              aria-pressed={tab === option.value}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium",
                tab === option.value ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300" : "text-slate-500 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800"
              )}
            >
              {option.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1 rounded-lg border border-slate-200 p-0.5 dark:border-slate-700">
          {MODULE_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setModule(option.value)}
              aria-pressed={module === option.value}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium",
                module === option.value ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300" : "text-slate-500 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800"
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {tab === "generate" && (
        <>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <VoiceTextarea
              value={prompt}
              onChange={setPrompt}
              placeholder={`e.g. Plan the migration of our database to the new provider, including backups, a rollback plan, and stakeholder communication.`}
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
                {loading ? "Generating…" : `Generate ${moduleLabel}`}
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
                  {creating ? "Creating…" : `Create ${selected.size} ${selected.size === 1 ? moduleLabelSingular : moduleLabel}`}
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {tab === "analyze" && (
        <>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <VoiceTextarea
              value={question}
              onChange={setQuestion}
              rows={2}
              placeholder={`Optional — ask something specific, e.g. "What's most at risk this week?" Leave blank for a general analysis.`}
            />
            <div className="mt-3 flex justify-end">
              <button
                type="button"
                onClick={handleAnalyze}
                disabled={analyzing}
                className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <SparklesIcon className="h-4 w-4" />
                {analyzing ? "Analyzing…" : `Analyze ${moduleLabel}`}
              </button>
            </div>
          </div>

          {analyzeError && (
            <div role="alert" className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
              <AlertTriangleIcon className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{analyzeError}</span>
            </div>
          )}

          {analysis && (
            <div className="whitespace-pre-line rounded-xl border border-slate-200 bg-white p-4 text-sm leading-relaxed text-slate-700 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
              {analysis}
            </div>
          )}
        </>
      )}
    </div>
  );
}
