"use client";

import { useCallback, useEffect, useState } from "react";
import { createCustomField, deleteCustomField, fetchCustomFields, updateCustomField } from "@/services/customFieldApi";
import { useToast } from "@/components/ui/Toast";
import type { CustomFieldDef, CustomFieldType } from "@/types/customField";

type LoadState = "loading" | "success" | "error";

interface UseCustomFieldsResult {
  fields: CustomFieldDef[];
  loadState: LoadState;
  addField: (input: { name: string; type: CustomFieldType; options: string[] }) => Promise<boolean>;
  editField: (id: string, patch: Partial<Pick<CustomFieldDef, "name" | "options">>) => Promise<void>;
  removeField: (id: string) => Promise<void>;
}

export function useCustomFields(): UseCustomFieldsResult {
  const [fields, setFields] = useState<CustomFieldDef[]>([]);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const toast = useToast();

  useEffect(() => {
    let cancelled = false;
    fetchCustomFields()
      .then((list) => {
        if (cancelled) return;
        setFields(list);
        setLoadState("success");
      })
      .catch(() => {
        if (cancelled) return;
        setLoadState("error");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const addField = useCallback(
    async (input: { name: string; type: CustomFieldType; options: string[] }) => {
      try {
        const created = await createCustomField(input);
        setFields((current) => [...current, created]);
        return true;
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to add field.");
        return false;
      }
    },
    [toast]
  );

  const editField = useCallback(
    async (id: string, patch: Partial<Pick<CustomFieldDef, "name" | "options">>) => {
      const previous = fields;
      setFields((current) => current.map((f) => (f.id === id ? { ...f, ...patch } : f)));
      try {
        await updateCustomField(id, patch);
      } catch (err) {
        setFields(previous);
        toast.error(err instanceof Error ? err.message : "Failed to update field.");
      }
    },
    [fields, toast]
  );

  const removeField = useCallback(
    async (id: string) => {
      const previous = fields;
      setFields((current) => current.filter((f) => f.id !== id));
      try {
        await deleteCustomField(id);
      } catch (err) {
        setFields(previous);
        toast.error(err instanceof Error ? err.message : "Failed to delete field.");
      }
    },
    [fields, toast]
  );

  return { fields, loadState, addField, editField, removeField };
}
