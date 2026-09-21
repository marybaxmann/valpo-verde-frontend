import { api } from "./client";
import type { AddProjectMemberInput, ProjectMember } from "../types/projectMember";

/**
 * Capa mínima de membresías: reutiliza `api` de client.ts. Endpoints
 * admin-only en el backend (assertAdmin en projectMember.service.ts) —
 * este archivo no repite esa verificación, solo llama.
 */
export function listProjectMembers(projectId: string): Promise<ProjectMember[]> {
  return api
    .get<{ data: ProjectMember[] }>(`/api/projects/${projectId}/members`)
    .then((res) => res.data);
}

export function addProjectMember(projectId: string, input: AddProjectMemberInput): Promise<void> {
  return api.post(`/api/projects/${projectId}/members`, input).then(() => undefined);
}

export function removeProjectMember(projectId: string, userId: string): Promise<void> {
  return api.delete(`/api/projects/${projectId}/members/${userId}`);
}
