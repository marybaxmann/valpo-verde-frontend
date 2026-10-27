import { api } from "./client";
import type { AddProjectMemberInput, ProjectMember } from "../types/projectMember";

/**
 * Miembros del proyecto en la API de la Fase 6 (`/api/sivu`; MIEMBROS_PROYECTO,
 * PR-004 v7.0). Los tres endpoints son solo del Administrador (assertAdmin en
 * services/sivu/projectMember.service.ts) — este archivo no repite esa
 * verificación, solo llama.
 */
export function listProjectMembers(projectId: string): Promise<ProjectMember[]> {
  return api
    .get<{ data: ProjectMember[] }>(`/api/sivu/projects/${projectId}/members`)
    .then((res) => res.data);
}

export function addProjectMember(projectId: string, input: AddProjectMemberInput): Promise<void> {
  return api.post(`/api/sivu/projects/${projectId}/members`, input).then(() => undefined);
}

export function removeProjectMember(projectId: string, userId: string): Promise<void> {
  return api.delete(`/api/sivu/projects/${projectId}/members/${userId}`);
}
