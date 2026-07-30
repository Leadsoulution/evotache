"use client";

import { useCallback, useMemo } from "react";
import useSWR from "swr";
import { createCustomField, deleteCustomField, fetchCustomFields, updateCustomField } from "@/services/customFieldApi";
import { useToast } from "@/components/ui/Toast";
import type { CustomFieldDef, CustomFieldOption, CustomFieldType } from "@/types/customField";

type LoadState = "loading" | "success" | "error";

interface UseCustomFieldsResult {
  fields: CustomFieldDef[];
  loadState: LoadState;
  addField: (input: { name: string; type: CustomFieldType; options: CustomFieldOption[] }) => Promise<boolean>;
  editField: (id: string, patch: Partial<Pick<CustomFieldDef, "name" | "options">>) => Promise<void>;
  removeField: (id: string) => Promise<void>;
}

const CUSTOM_FIELDS_KEY = "custom-fields";

export function useCustomFields(): UseCustomFieldsResult {
  const toast = useToast();
  const { data, error, isLoading, mutate } = useSWR<CustomFieldDef[]>(CUSTOM_FIELDS_KEY, fetchCustomFields);
  const fields = useMemo(() => data ?? [], [data]);
  const loadState: LoadState = error ? "error" : isLoading ? "loading" : "success";

  const addField = useCallback(
    async (input: { name: string; type: CustomFieldType; options: CustomFieldOption[] }) => {
      try {
        const created = await createCustomField(input);
        await mutate([...fields, created], { revalidate: false });
        return true;
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to add field.");
        return false;
      }
    },
    [fields, mutate, toast]
  );

  const editField = useCallback(
    async (id: string, patch: Partial<Pick<CustomFieldDef, "name" | "options">>) => {
      const previous = fields;
      await mutate(previous.map((f) => (f.id === id ? { ...f, ...patch } : f)), { revalidate: false });
      try {
        await updateCustomField(id, patch);
      } catch (err) {
        await mutate(previous, { revalidate: false });
        toast.error(err instanceof Error ? err.message : "Failed to update field.");
      }
    },
    [fields, mutate, toast]
  );

  const removeField = useCallback(
    async (id: string) => {
      const previous = fields;
      await mutate(previous.filter((f) => f.id !== id), { revalidate: false });
      try {
        await deleteCustomField(id);
      } catch (err) {
        await mutate(previous, { revalidate: false });
        toast.error(err instanceof Error ? err.message : "Failed to delete field.");
      }
    },
    [fields, mutate, toast]
  );

  return { fields, loadState, addField, editField, removeField };
}
