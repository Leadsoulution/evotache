"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createAgentRequest, deleteAgentRequest, fetchAgents, updateAgentRequest } from "@/services/agentApi";
import type { CreateAgentInput, UpdateAgentInput } from "@/services/agentApi";
import { useToast } from "@/components/ui/Toast";
import type { Agent } from "@/types/agent";

type LoadState = "loading" | "success" | "error";

interface UseAgentsResult {
  agents: Agent[];
  loadState: LoadState;
  errorMessage: string | null;
  refetch: () => void;
  createAgent: (input: CreateAgentInput) => Promise<boolean>;
  updateAgent: (id: string, patch: UpdateAgentInput) => Promise<boolean>;
  deleteAgent: (id: string) => Promise<void>;
}

export function useAgents(): UseAgentsResult {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const toast = useToast();
  const agentsRef = useRef<Agent[]>([]);

  useEffect(() => {
    agentsRef.current = agents;
  }, [agents]);

  const load = useCallback(() => {
    setLoadState("loading");
    setErrorMessage(null);
    fetchAgents()
      .then((list) => {
        setAgents(list);
        setLoadState("success");
      })
      .catch((err: unknown) => {
        setLoadState("error");
        setErrorMessage(err instanceof Error ? err.message : "Something went wrong.");
      });
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchAgents()
      .then((list) => {
        if (cancelled) return;
        setAgents(list);
        setLoadState("success");
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setLoadState("error");
        setErrorMessage(err instanceof Error ? err.message : "Something went wrong.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const createAgent = useCallback(
    async (input: CreateAgentInput) => {
      try {
        const created = await createAgentRequest(input);
        setAgents((current) => [...current, created]);
        toast.success(`${created.name} was added.`);
        return true;
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to create agent.");
        return false;
      }
    },
    [toast]
  );

  const updateAgent = useCallback(
    async (id: string, patch: UpdateAgentInput) => {
      const previous = agentsRef.current;
      try {
        const updated = await updateAgentRequest(id, patch);
        setAgents((current) => current.map((a) => (a.id === id ? updated : a)));
        return true;
      } catch (err) {
        setAgents(previous);
        toast.error(err instanceof Error ? err.message : "Failed to update agent.");
        return false;
      }
    },
    [toast]
  );

  const deleteAgent = useCallback(
    async (id: string) => {
      const previous = agentsRef.current;
      setAgents(previous.filter((a) => a.id !== id));
      try {
        await deleteAgentRequest(id);
      } catch (err) {
        setAgents(previous);
        toast.error(err instanceof Error ? err.message : "Failed to delete agent.");
      }
    },
    [toast]
  );

  return { agents, loadState, errorMessage, refetch: load, createAgent, updateAgent, deleteAgent };
}
