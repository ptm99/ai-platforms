import { axiosClient } from './axiosClient';
import { storeTokens, clearTokens } from '../utils/token';

export interface AuthUser {
  id: string;
  email: string;
  display_name?: string | null;
  role: 'user' | 'admin' | 'superadmin';
}

interface AuthResponse {
  user: AuthUser;
  tokens: {
    accessToken: string;
    refreshToken: string;
  };
}

export async function apiLogin(email: string, password: string): Promise<AuthUser> {
  const res = await axiosClient.post<AuthResponse>('/auth/login', { email, password });
  storeTokens(res.data.tokens.accessToken, res.data.tokens.refreshToken);
  return res.data.user;
}

export async function apiRegister(
  email: string,
  password: string,
  displayName?: string
): Promise<AuthUser> {
  const res = await axiosClient.post<AuthResponse>('/auth/register', {
    email,
    password,
    display_name: displayName
  });
  storeTokens(res.data.tokens.accessToken, res.data.tokens.refreshToken);
  return res.data.user;
}

export async function apiMe(): Promise<AuthUser | null> {
  try {
    const res = await axiosClient.get<{ user: AuthUser }>('/auth/me');
    return res.data.user;
  } catch {
    return null;
  }
}

export async function apiLogout(refreshToken: string | null) {
  try {
    await axiosClient.post('/auth/logout', { refreshToken });
  } catch {
    // ignore
  }
  clearTokens();
}
