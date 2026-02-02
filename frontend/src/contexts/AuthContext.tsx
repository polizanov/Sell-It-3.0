/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { http, type HttpError } from '../services/http';

export type AuthUser = {
  email: string;
  username: string;
  profileImageUrl: string | null;
  isEmailVerified: boolean;
};

type AuthContextValue = {
  token: string | null;
  userId: string | null;
  user: AuthUser | null;
  isLoading: boolean;
  login: (args: { email: string; password: string }) => Promise<void>;
  register: (args: { email: string; password: string; username: string }) => Promise<void>;
  logout: () => void;
  refreshMe: () => Promise<void>;
  resendVerification: () => Promise<void>;
  lastError: HttpError | null;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function setToken(token: string | null) {
  if (token) localStorage.setItem('sellit_token', token);
  else localStorage.removeItem('sellit_token');
}

function getToken() {
  return localStorage.getItem('sellit_token');
}

function decodeJwtPayload(token: string): unknown {
  const parts = token.split('.');
  if (parts.length < 2) throw new Error('Invalid JWT');
  const raw = parts[1];

  const normalized = raw.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '=');
  const json = atob(padded);
  return JSON.parse(json) as unknown;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

function extractUserIdFromToken(token: string | null) {
  if (!token) return null;
  try {
    const payload = decodeJwtPayload(token);
    if (!isRecord(payload)) return null;

    // Backend uses `sub` as user id; keep fallbacks for safety.
    const maybe =
      (typeof payload.sub === 'string' && payload.sub) ||
      (typeof payload.userId === 'string' && payload.userId) ||
      (typeof payload.id === 'string' && payload.id) ||
      null;
    return maybe;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [tokenState, setTokenState] = useState<string | null>(() => getToken());
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastError, setLastError] = useState<HttpError | null>(null);

  const userId = useMemo(() => extractUserIdFromToken(tokenState), [tokenState]);

  const logout = useCallback(() => {
    setToken(null);
    setTokenState(null);
    setUser(null);
  }, []);

  const refreshMe = useCallback(async () => {
    const token = getToken();
    setTokenState(token);
    if (!token) {
      setUser(null);
      return;
    }

    try {
      const res = await http<{ user: AuthUser }>('/api/auth/me');
      setUser(res.user);
    } catch (e) {
      const err = e as HttpError;
      setLastError(err);
      if (err.status === 401) logout();
      throw err;
    }
  }, [logout]);

  useEffect(() => {
    (async () => {
      try {
        await refreshMe();
      } finally {
        setIsLoading(false);
      }
    })();
  }, [refreshMe]);

  const login = useCallback(async (args: { email: string; password: string }) => {
    setLastError(null);
    const res = await http<{ token: string; user: AuthUser }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(args)
    });
    setToken(res.token);
    setTokenState(res.token);
    setUser(res.user);
  }, []);

  const register = useCallback(async (args: { email: string; password: string; username: string }) => {
    setLastError(null);
    const res = await http<{ token: string; user: AuthUser }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(args)
    });
    setToken(res.token);
    setTokenState(res.token);
    setUser(res.user);
  }, []);

  const resendVerification = useCallback(async () => {
    setLastError(null);
    await http<{ message: string }>('/api/auth/resend-verification', { method: 'POST' });
    await refreshMe();
  }, [refreshMe]);

  const value = useMemo<AuthContextValue>(
    () => ({
      token: tokenState,
      userId,
      user,
      isLoading,
      login,
      register,
      logout,
      refreshMe,
      resendVerification,
      lastError
    }),
    [tokenState, userId, user, isLoading, login, register, logout, refreshMe, resendVerification, lastError]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

