import { createContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { api } from "../lib/api-client";
import { primeOfflineCache } from "../lib/cache-primer";
import type { Technician, LoginResponse } from "../types";

interface AuthState {
  token: string | null;
  user: Technician | null;
  isLoading: boolean;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

const TOKEN_KEY = "rsimd_items_token";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    token: null,
    user: null,
    isLoading: true,
  });

  useEffect(() => {
    const savedToken = localStorage.getItem(TOKEN_KEY);
    if (!savedToken) {
      setState((s) => ({ ...s, isLoading: false }));
      return;
    }

    api.setToken(savedToken);
    api
      .get<Technician>("/auth/me")
      .then((user) => {
        setState({ token: savedToken, user, isLoading: false });
        primeOfflineCache().catch(() => {});
      })
      .catch(() => {
        localStorage.removeItem(TOKEN_KEY);
        api.setToken(null);
        setState({ token: null, user: null, isLoading: false });
      });
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { token, technician } = await api.post<LoginResponse>("/auth/login", {
      email,
      pin: password,
    });

    localStorage.setItem(TOKEN_KEY, token);
    api.setToken(token);
    setState({ token, user: technician, isLoading: false });
    primeOfflineCache().catch(() => {});
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post("/auth/logout", {});
    } catch {
      // Ignore logout errors
    }

    localStorage.removeItem(TOKEN_KEY);
    api.setToken(null);
    setState({ token: null, user: null, isLoading: false });
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
