"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { login as loginRequest, logout as logoutRequest, restoreSession } from "@/services/authApi";
import type { AppUser } from "@/types/user";

type AuthStatus = "loading" | "authenticated" | "unauthenticated";

interface AuthContextValue {
  user: AppUser | null;
  status: AuthStatus;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");

  useEffect(() => {
    let cancelled = false;
    restoreSession()
      .then((restoredUser) => {
        if (cancelled) return;
        setUser(restoredUser);
        setStatus(restoredUser ? "authenticated" : "unauthenticated");
        // Reaching this point means the app loaded fine — clear the
        // chunk-error auto-reload guard so a genuinely new stale-cache
        // error after a future deploy can still trigger one recovery reload.
        window.sessionStorage.removeItem("evotasks.chunkErrorReloaded");
      })
      .catch(() => {
        if (cancelled) return;
        setUser(null);
        setStatus("unauthenticated");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const loggedInUser = await loginRequest(email, password);
    setUser(loggedInUser);
    setStatus("authenticated");
  }, []);

  const logout = useCallback(() => {
    logoutRequest();
    setUser(null);
    setStatus("unauthenticated");
  }, []);

  const value = useMemo<AuthContextValue>(() => ({ user, status, login, logout }), [user, status, login, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
