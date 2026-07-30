"use client";

import { useCallback, useMemo } from "react";
import useSWR from "swr";
import { createUserRequest, deleteUserRequest, fetchUsers, updateUserRequest } from "@/services/userApi";
import { useToast } from "@/components/ui/Toast";
import type { AppUser, Role, UserStatus } from "@/types/user";

type LoadState = "loading" | "success" | "error";

interface CreateUserInput {
  name: string;
  email: string;
  password: string;
  role: Role;
  color: string;
  photoDataUrl?: string | null;
  managerIds?: string[];
  teamIds?: string[];
  visibleSectionHrefs?: string[] | null;
  hiddenColumnIds?: string[];
}

interface UpdateUserPatch {
  name?: string;
  email?: string;
  role?: Role;
  status?: UserStatus;
  password?: string;
  color?: string;
  photoDataUrl?: string | null;
  managerIds?: string[];
  teamIds?: string[];
  visibleSectionHrefs?: string[] | null;
  hiddenColumnIds?: string[];
}

interface UseUsersResult {
  users: AppUser[];
  loadState: LoadState;
  errorMessage: string | null;
  refetch: () => void;
  createUser: (input: CreateUserInput) => Promise<boolean>;
  updateUser: (id: string, patch: UpdateUserPatch) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
}

/** Shared cache key — every component that calls useUsers() reuses the same
 * in-flight request and cached result instead of each fetching independently. */
const USERS_KEY = "users";

export function useUsers(): UseUsersResult {
  const toast = useToast();
  const { data, error, isLoading, mutate } = useSWR<AppUser[]>(USERS_KEY, fetchUsers);
  const users = useMemo(() => data ?? [], [data]);
  const loadState: LoadState = error ? "error" : isLoading ? "loading" : "success";
  const errorMessage = error ? (error instanceof Error ? error.message : "Something went wrong.") : null;

  const refetch = useCallback(() => {
    void mutate();
  }, [mutate]);

  const createUser = useCallback(
    async (input: CreateUserInput) => {
      try {
        const created = await createUserRequest(input);
        await mutate([...(users), created], { revalidate: false });
        toast.success(`${created.name} was added.`);
        return true;
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to create user.");
        return false;
      }
    },
    [users, mutate, toast]
  );

  const updateUser = useCallback(
    async (id: string, patch: UpdateUserPatch) => {
      const previous = users;
      const userPatch: Partial<AppUser> = {
        ...(patch.name !== undefined && { name: patch.name }),
        ...(patch.email !== undefined && { email: patch.email }),
        ...(patch.role !== undefined && { role: patch.role }),
        ...(patch.status !== undefined && { status: patch.status }),
        ...(patch.color !== undefined && { color: patch.color }),
        ...(patch.photoDataUrl !== undefined && { photoDataUrl: patch.photoDataUrl }),
        ...(patch.managerIds !== undefined && { managerIds: patch.managerIds }),
        ...(patch.visibleSectionHrefs !== undefined && { visibleSectionHrefs: patch.visibleSectionHrefs }),
        ...(patch.hiddenColumnIds !== undefined && { hiddenColumnIds: patch.hiddenColumnIds }),
      };
      await mutate(previous.map((u) => (u.id === id ? { ...u, ...userPatch } : u)), { revalidate: false });
      try {
        const updated = await updateUserRequest(id, patch);
        await mutate((current) => (current ?? previous).map((u) => (u.id === id ? updated : u)), { revalidate: false });
      } catch (err) {
        await mutate(previous, { revalidate: false });
        toast.error(err instanceof Error ? err.message : "Failed to update user.");
      }
    },
    [users, mutate, toast]
  );

  const deleteUser = useCallback(
    async (id: string) => {
      const previous = users;
      await mutate(previous.filter((u) => u.id !== id), { revalidate: false });
      try {
        await deleteUserRequest(id);
      } catch (err) {
        await mutate(previous, { revalidate: false });
        toast.error(err instanceof Error ? err.message : "Failed to delete user.");
      }
    },
    [users, mutate, toast]
  );

  return { users, loadState, errorMessage, refetch, createUser, updateUser, deleteUser };
}
