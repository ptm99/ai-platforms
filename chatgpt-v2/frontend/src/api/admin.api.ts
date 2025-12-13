// src/api/admin.api.ts

import { axiosClient } from './axiosClient';

export interface AIProvider {
  id: string;
  code: string;
  display_name: string;
  adapter_file: string;
  is_enabled: boolean;
  description?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface AIProviderModel {
  id: string;
  provider_id: string;
  model_name: string;
  context_length?: number | null;
  is_enabled: boolean;
  created_at?: string;
}

export interface AIProviderKey {
  id: string;
  provider_id: string;
  model_id: string;
  name?: string | null;
  status: 'active' | 'exhausted' | 'disabled';
  daily_limit: number;
  daily_usage: number;
  last_used_at?: string | null;
  created_at?: string;
}

export interface AdminUser {
  id: string;
  email: string;
  display_name?: string | null;
  role: 'user' | 'admin' | 'superadmin';
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

/* Providers */
export async function adminListProviders(): Promise<AIProvider[]> {
  const res = await axiosClient.get('/admin/providers');
  return res.data;
}

export async function adminCreateProvider(payload: {
  code: string;
  display_name: string;
  adapter_file: string;
  description?: string;
}): Promise<AIProvider> {
  const res = await axiosClient.post('/admin/providers', payload);
  return res.data;
}

export async function adminToggleProvider(providerId: string, is_enabled: boolean): Promise<AIProvider> {
  const res = await axiosClient.patch(`/admin/providers/${providerId}`, { is_enabled });
  return res.data;
}

export async function adminDeleteProvider(providerId: string): Promise<void> {
  await axiosClient.delete(`/admin/providers/${providerId}`);
}

/* Models */
export async function adminListModels(providerId?: string): Promise<AIProviderModel[]> {
  const res = await axiosClient.get('/admin/models', { params: providerId ? { provider_id: providerId } : {} });
  return res.data;
}

export async function adminCreateModel(payload: {
  provider_id: string;
  model_name: string;
  context_length?: number;
}): Promise<AIProviderModel> {
  const res = await axiosClient.post('/admin/models', payload);
  return res.data;
}

export async function adminToggleModel(modelId: string, is_enabled: boolean): Promise<AIProviderModel> {
  const res = await axiosClient.patch(`/admin/models/${modelId}`, { is_enabled });
  return res.data;
}

export async function adminDeleteModel(modelId: string): Promise<void> {
  await axiosClient.delete(`/admin/models/${modelId}`);
}

/* Keys */
export async function adminListKeys(modelId?: string): Promise<AIProviderKey[]> {
  const res = await axiosClient.get('/admin/keys', { params: modelId ? { model_id: modelId } : {} });
  return res.data;
}

export async function adminCreateKey(payload: {
  provider_id: string;
  model_id: string;
  name?: string;
  api_key_plain: string;   // backend should encrypt server-side
  daily_limit?: number;
}): Promise<AIProviderKey> {
  const res = await axiosClient.post('/admin/keys', payload);
  return res.data;
}

export async function adminUpdateKey(payload: {
  key_id: string;
  status?: 'active' | 'exhausted' | 'disabled';
  daily_limit?: number;
}): Promise<AIProviderKey> {
  const res = await axiosClient.patch(`/admin/keys/${payload.key_id}`, payload);
  return res.data;
}

export async function adminDeleteKey(keyId: string): Promise<void> {
  await axiosClient.delete(`/admin/keys/${keyId}`);
}

/* Users (superadmin) */
export async function adminListUsers(): Promise<AdminUser[]> {
  const res = await axiosClient.get('/auth/admin/users');
  return res.data;
}

export async function adminSetUserRole(userId: string, role: AdminUser['role']): Promise<AdminUser> {
  const res = await axiosClient.patch(`/auth/admin/users/${userId}/role`, { role });
  return res.data;
}
