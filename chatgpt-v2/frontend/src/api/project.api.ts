// src/api/project.api.ts

import { axiosClient } from './axiosClient';

export type Visibility = 'private' | 'shared' | 'public';
export type MemberPermission = 'read' | 'edit';

export interface Project {
  id: string;
  owner_id: string;
  title: string;
  visibility: Visibility;
  provider_id: string;
  model_id: string;
  provider_key_id: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectMember {
  user_id: string;
  email: string;
  display_name: string | null;
  role: 'owner' | 'member';
  permission: MemberPermission | null;
  added_at: string | null;
}

// basic project APIs
export async function apiListProjects(): Promise<Project[]> {
  const res = await axiosClient.get<Project[]>('/projects');
  return res.data;
}

export async function apiCreateProject(payload: {
  title: string;
  provider_id: string;
  model_id: string;
}): Promise<Project> {
  const res = await axiosClient.post<Project>('/projects', payload);
  return res.data;
}

export async function apiGetProject(id: string): Promise<Project> {
  const res = await axiosClient.get<Project>(`/projects/${id}`);
  return res.data;
}

// sharing APIs
export async function apiGetProjectMembers(projectId: string): Promise<ProjectMember[]> {
  const res = await axiosClient.get<ProjectMember[]>(`/projects/${projectId}/members`);
  return res.data;
}

export async function apiAddProjectMember(
  projectId: string,
  email: string,
  permission: MemberPermission
): Promise<ProjectMember[]> {
  const res = await axiosClient.post<ProjectMember[]>(`/projects/${projectId}/members`, {
    email,
    permission
  });
  return res.data;
}

export async function apiUpdateProjectMember(
  projectId: string,
  userId: string,
  permission: MemberPermission
): Promise<ProjectMember[]> {
  const res = await axiosClient.patch<ProjectMember[]>(
    `/projects/${projectId}/members/${userId}`,
    { permission }
  );
  return res.data;
}

export async function apiRemoveProjectMember(
  projectId: string,
  userId: string
): Promise<ProjectMember[]> {
  const res = await axiosClient.delete<ProjectMember[]>(
    `/projects/${projectId}/members/${userId}`
  );
  return res.data;
}

export async function apiLeaveProject(projectId: string): Promise<void> {
  await axiosClient.delete(`/projects/${projectId}/members/me`);
}

export async function apiUpdateProjectVisibility(
  projectId: string,
  visibility: Visibility
): Promise<Project> {
  const res = await axiosClient.patch<Project>(`/projects/${projectId}/visibility`, {
    visibility
  });
  return res.data;
}

export async function apiCloneProject(projectId: string): Promise<Project> {
  const res = await axiosClient.post<Project>(`/projects/${projectId}/clone`);
  return res.data;
}
