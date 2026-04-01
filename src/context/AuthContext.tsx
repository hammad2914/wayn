import React, { createContext, useState, useEffect, useCallback } from 'react';
import type { User } from '../types';
import { BACKEND_API } from '../config/api';

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

  const login = useCallback((newToken: string, newUser: User) => {
    const userWithAlias = { ...newUser, name: newUser.fullName };
    localStorage.setItem(TOKEN_KEY, newToken);
    localStorage.setItem(USER_KEY, JSON.stringify(userWithAlias));
    setToken(newToken);
    setUser(userWithAlias);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setToken(null);
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    const stored = localStorage.getItem(TOKEN_KEY);
    if (!stored) return;
    try {
      const res = await fetch(`${BACKEND_API}/auth/me`, {
        headers: { Authorization: `Bearer ${stored}` },
      });
      if (res.ok) {
        const json = await res.json();
        const fresh = { ...json.data, name: json.data.fullName };
        localStorage.setItem(USER_KEY, JSON.stringify(fresh));
        setUser(fresh);
      } else {
        logout();
      }
    } catch {
      // Backend unavailable — use cached user
    }
  }, [logout]);

  // On mount: restore from localStorage, then validate token
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
    // Silently refresh in background
    if (storedToken) refreshUser();
  }, [refreshUser]);

  return (
    <AuthContext.Provider value={{
      user, token, isAuthenticated: !!user, isLoading, login, logout, refreshUser,
    }}>
      {children}
    </AuthContext.Provider>
  );
};
