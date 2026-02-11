import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { login as apiLogin } from '@/api/authApi';

export type UserMode = 'demo' | 'authenticated';

type AuthUser = {
  userId: string;
};

type AuthContextValue = {
  mode: UserMode;
  user: AuthUser | null;
  token: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
};

const STORAGE_KEY = 'floodshield.auth';

const AuthContext = createContext<AuthContextValue | null>(null);

type StoredAuth = {
  token: string;
  userId: string;
};

function readStoredAuth(): StoredAuth | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredAuth>;
    if (typeof parsed.token === 'string' && typeof parsed.userId === 'string') return parsed as StoredAuth;
    return null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    const stored = readStoredAuth();
    if (stored) {
      setToken(stored.token);
      setUser({ userId: stored.userId });
    }
  }, []);

  const logout = () => {
    setToken(null);
    setUser(null);
    window.localStorage.removeItem(STORAGE_KEY);
  };

  const login = async (username: string, password: string) => {
    const res = await apiLogin({ username, password });
    setToken(res.token);
    setUser({ userId: res.userId });
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ token: res.token, userId: res.userId } satisfies StoredAuth));
  };

  const mode: UserMode = token && user ? 'authenticated' : 'demo';

  const value = useMemo<AuthContextValue>(
    () => ({
      mode,
      user,
      token,
      login,
      logout,
    }),
    [mode, token, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export function getPolygonsStorageKey(userId: string) {
  return `floodshield.polygons.${userId}`;
}
