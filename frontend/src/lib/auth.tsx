// AuthProvider — guarda usuário, token, controla rotas protegidas.
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api, ApiUser, getToken, setToken } from './api';

type AuthState = {
  user: ApiUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<ApiUser>;
  register: (b: { name: string; email: string; password: string; preferred_instrument?: string }) => Promise<ApiUser>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  setUser: (u: ApiUser | null) => void;
};

const Ctx = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<ApiUser | null>(null);
  const [loading, setLoading] = useState(true);

  const bootstrap = useCallback(async () => {
    setLoading(true);
    try {
      const t = await getToken();
      if (t) {
        const me = await api.me();
        setUser(me);
      }
    } catch {
      await setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  const login = async (email: string, password: string) => {
    const r = await api.login({ email, password });
    await setToken(r.access_token);
    setUser(r.user);
    return r.user;
  };

  const register = async (b: { name: string; email: string; password: string; preferred_instrument?: string }) => {
    const r = await api.register(b);
    await setToken(r.access_token);
    setUser(r.user);
    return r.user;
  };

  const logout = async () => {
    await setToken(null);
    setUser(null);
  };

  const refresh = async () => {
    try {
      const me = await api.me();
      setUser(me);
    } catch {
      /* noop */
    }
  };

  return (
    <Ctx.Provider value={{ user, loading, login, register, logout, refresh, setUser }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAuth fora do AuthProvider');
  return v;
}
