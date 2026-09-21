import { api } from "./client";
import type { CreateProjectInput, Project } from "../types/project";

/**
 * Capa mínima de proyectos: reutiliza `api` de client.ts (HTTP + JWT ya
 * resueltos ahí). Nada de fetch/headers/tokens propios aquí.
 */
export function listProjects(): Promise<Project[]> {
  return api.get<{ data: Project[] }>("/api/projects").then((res) => res.data);
}

export function getProject(id: string): Promise<Project> {
  return api.get<{ data: Project }>(`/api/projects/${id}`).then((res) => res.data);
}

export function createProject(input: CreateProjectInput): Promise<Project> {
  return api.post<{ data: Project }>("/api/projects", input).then((res) => res.data);
}
