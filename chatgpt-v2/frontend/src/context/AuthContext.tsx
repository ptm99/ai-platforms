import React, { createContext, useEffect, useState, ReactNode } from 'react';
import { AuthUser, apiMe, apiLogin, apiRegister, apiLogout } from '../api/auth.api';
import { getRefreshToken } from '../utils/token';

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName?: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  login: async () => {},
  register: async () => {},
  logout: async () => {}
});

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      if (getRefreshToken()) {
        const me = await apiMe();
        setUser(me);
      }
      setLoading(false);
    };
    void init();
  }, []);

  const login = async (email: string, password: string) => {
    const u = await apiLogin(email, password);
    setUser(u);
  };

  const register = async (email: string, password: string, displayName?: string) => {
    const u = await apiRegister(email, password, displayName);
    setUser(u);
  };

  const logout = async () => {
    await apiLogout(getRefreshToken());
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
