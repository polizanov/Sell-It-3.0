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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [tokenState, setTokenState] = useState<string | null>(() => getToken());
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastError, setLastError] = useState<HttpError | null>(null);

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
      user,
      isLoading,
      login,
      register,
      logout,
      refreshMe,
      resendVerification,
      lastError
    }),
    [tokenState, user, isLoading, login, register, logout, refreshMe, resendVerification, lastError]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

