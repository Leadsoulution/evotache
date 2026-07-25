"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
  managerIds?: string[];
  teamIds?: string[];
}

interface UpdateUserPatch {
  name?: string;
  email?: string;
  role?: Role;
  status?: UserStatus;
  password?: string;
  managerIds?: string[];
  teamIds?: string[];
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

export function useUsers(): UseUsersResult {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const toast = useToast();
  const usersRef = useRef<AppUser[]>([]);

  useEffect(() => {
    usersRef.current = users;
  }, [users]);

  const refetch = useCallback(() => {
    setLoadState("loading");
    setErrorMessage(null);
    fetchUsers()
      .then((list) => {
        setUsers(list);
        setLoadState("success");
      })
      .catch((err: unknown) => {
        setLoadState("error");
        setErrorMessage(err instanceof Error ? err.message : "Something went wrong.");
      });
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchUsers()
      .then((list) => {
        if (cancelled) return;
        setUsers(list);
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

  const createUser = useCallback(
    async (input: CreateUserInput) => {
      try {
        const created = await createUserRequest(input);
        setUsers((current) => [...current, created]);
        toast.success(`${created.name} was added.`);
        return true;
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to create user.");
        return false;
      }
    },
    [toast]
  );

  const updateUser = useCallback(
    async (id: string, patch: UpdateUserPatch) => {
      const previous = usersRef.current;
      const userPatch: Partial<AppUser> = {
        ...(patch.name !== undefined && { name: patch.name }),
        ...(patch.email !== undefined && { email: patch.email }),
        ...(patch.role !== undefined && { role: patch.role }),
        ...(patch.status !== undefined && { status: patch.status }),
        ...(patch.managerIds !== undefined && { managerIds: patch.managerIds }),
      };
      setUsers(previous.map((u) => (u.id === id ? { ...u, ...userPatch } : u)));
      try {
        const updated = await updateUserRequest(id, patch);
        setUsers((current) => current.map((u) => (u.id === id ? updated : u)));
      } catch (err) {
        setUsers(previous);
        toast.error(err instanceof Error ? err.message : "Failed to update user.");
      }
    },
    [toast]
  );

  const deleteUser = useCallback(
    async (id: string) => {
      const previous = usersRef.current;
      setUsers(previous.filter((u) => u.id !== id));
      try {
        await deleteUserRequest(id);
      } catch (err) {
        setUsers(previous);
        toast.error(err instanceof Error ? err.message : "Failed to delete user.");
      }
    },
    [toast]
  );

  return { users, loadState, errorMessage, refetch, createUser, updateUser, deleteUser };
}
