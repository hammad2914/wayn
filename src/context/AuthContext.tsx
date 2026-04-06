import React, { createContext, useState, useEffect, useCallback } from 'react';
import type { User } from '../types';
import { authAPI } from '../services/api';

interface AuthContextValue {
  user:            User | null;
  token:           string | null;
  isAuthenticated: boolean;
  isLoading:       boolean;
  login:           (token: string, user: User) => void;
  logout:          () => void;
  refreshUser:     () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue>({
  user: null, token: null, isAuthenticated: false, isLoading: true,
  login: () => {}, logout: () => {}, refreshUser: async () => {},
});

const TOKEN_KEY = 'wayn_token';
const USER_KEY  = 'wayn_user';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user,      setUser]      = useState<User | null>(null);
  const [token,     setToken]     = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const clearLocal = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setToken(null);
    setUser(null);
  }, []);

  const login = useCallback((newToken: string, newUser: User) => {
    const userWithAlias = { ...newUser, name: newUser.fullName };
    localStorage.setItem(TOKEN_KEY, newToken);
    localStorage.setItem(USER_KEY, JSON.stringify(userWithAlias));
    setToken(newToken);
    setUser(userWithAlias);
  }, []);

  const logout = useCallback(() => {
    // Tell backend to delete the refresh token + clear cookie
    authAPI.logout().catch(() => { /* ignore network errors on logout */ });
    clearLocal();
  }, [clearLocal]);

  const refreshUser = useCallback(async () => {
    const stored = localStorage.getItem(TOKEN_KEY);
    if (!stored) return;
    try {
      const res = await authAPI.me();
      if (res.data?.data) {
        const fresh = { ...res.data.data, name: res.data.data.fullName };
        localStorage.setItem(USER_KEY, JSON.stringify(fresh));
        setUser(fresh);
      }
    } catch (err: unknown) {
      // If 401, the axios interceptor already tried a token refresh.
      // If it still fails here the interceptor will dispatch wayn:logout — don't double-logout.
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status && status !== 401) clearLocal();
    }
  }, [clearLocal]);

  // Force-logout event dispatched by axios interceptor when refresh fails
  useEffect(() => {
    const handle = () => clearLocal();
    window.addEventListener('wayn:logout', handle);
    return () => window.removeEventListener('wayn:logout', handle);
  }, [clearLocal]);

  // On mount: restore from localStorage, then silently validate / refresh
  useEffect(() => {
    const storedToken = localStorage.getItem(TOKEN_KEY);
    const storedUser  = localStorage.getItem(USER_KEY);
    if (storedToken && storedUser) {
      try {
        const parsed = JSON.parse(storedUser) as User;
        setToken(storedToken);
        setUser({ ...parsed, name: parsed.fullName || parsed.name });
      } catch { /* corrupt storage */ }
    }
    setIsLoading(false);
    if (storedToken) refreshUser();
  }, [refreshUser]);

  // Keep local token state in sync whenever localStorage changes (e.g. after interceptor refresh)
  useEffect(() => {
    const sync = () => {
      const t = localStorage.getItem(TOKEN_KEY);
      setToken(t);
    };
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);

  return (
    <AuthContext.Provider value={{
      user, token, isAuthenticated: !!user, isLoading, login, logout, refreshUser,
    }}>
      {children}
    </AuthContext.Provider>
  );
};
