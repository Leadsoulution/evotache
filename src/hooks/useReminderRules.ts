"use client";

import { useCallback, useMemo } from "react";
import useSWR from "swr";
import { createReminderRule, deleteReminderRule, fetchReminderRules, updateReminderRule } from "@/services/reminderApi";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/components/ui/Toast";
import type { ReminderRule, ReminderRuleInput } from "@/types/reminder";

type LoadState = "loading" | "success" | "error";

const REMINDER_RULES_KEY = "reminder-rules";

export function useReminderRules() {
  const { user } = useAuth();
  const toast = useToast();
  const { data, error, isLoading, mutate } = useSWR<ReminderRule[]>(user ? REMINDER_RULES_KEY : null, fetchReminderRules);
  const rules = useMemo(() => data ?? [], [data]);
  const loadState: LoadState = error ? "error" : isLoading ? "loading" : "success";
  const errorMessage = error ? (error instanceof Error ? error.message : "Something went wrong.") : null;

  const refetch = useCallback(() => {
    void mutate();
  }, [mutate]);

  const addRule = useCallback(
    async (input: ReminderRuleInput) => {
      try {
        const created = await createReminderRule(input);
        await mutate([...rules, created], { revalidate: false });
        return true;
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to create reminder rule.");
        return false;
      }
    },
    [rules, mutate, toast]
  );

  const editRule = useCallback(
    async (id: string, patch: Partial<ReminderRuleInput> & { resetLastRun?: boolean }) => {
      const previous = rules;
      await mutate(previous.map((r) => (r.id === id ? { ...r, ...patch } : r)), { revalidate: false });
      try {
        const updated = await updateReminderRule(id, patch);
        await mutate((current) => (current ?? previous).map((r) => (r.id === id ? updated : r)), { revalidate: false });
      } catch (err) {
        await mutate(previous, { revalidate: false });
        toast.error(err instanceof Error ? err.message : "Failed to update reminder rule.");
      }
    },
    [rules, mutate, toast]
  );

  const removeRule = useCallback(
    async (id: string) => {
      const previous = rules;
      await mutate(previous.filter((r) => r.id !== id), { revalidate: false });
      try {
        await deleteReminderRule(id);
      } catch (err) {
        await mutate(previous, { revalidate: false });
        toast.error(err instanceof Error ? err.message : "Failed to delete reminder rule.");
      }
    },
    [rules, mutate, toast]
  );

  return { rules, loadState, errorMessage, refetch, addRule, editRule, removeRule };
}
