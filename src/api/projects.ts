import { api } from "./client";
import { cachedGet } from "./cache";
import type { CreateProjectInput, EditProjectInput, Project, ProjectWithSector } from "../types/project";

/**
 * Capa mínima de proyectos: reutiliza `api` de client.ts (HTTP + JWT ya
 * resueltos ahí). Nada de fetch/headers/tokens propios aquí.
 *
 * Lecturas desde la API de la Fase 6 (Fase 7, Paso 2): el backend decide
 * qué proyectos ve cada rol (Administrador: todos; los demás: solo
 * aquellos de los que son miembros).
 */
export function listProjects(): Promise<Project[]> {
  return api.get<{ data: Project[] }>("/api/sivu/projects").then((res) => res.data);
}

export function getProjectWithSector(id: string): Promise<ProjectWithSector> {
  return cachedGet(`project:${id}`, () =>
    api.get<{ data: ProjectWithSector }>(`/api/sivu/projects/${id}`).then((res) => res.data)
  );
}

export function getProject(id: string): Promise<Project> {
  return getProjectWithSector(id).then((res) => res.proyecto);
}

/**
 * PATCH /api/sivu/projects/:id (solo Administrador; `editarProyectoSchema`).
 * Solo nombres: la delimitación del sector (KML/KMZ) no se edita aquí. Con el
 * proyecto Cerrado el backend responde 409 (CC-042).
 */
export function editProject(id: string, input: EditProjectInput): Promise<void> {
  return api.patch(`/api/sivu/projects/${id}`, input).then(() => undefined);
}

/**
 * PATCH /api/sivu/projects/:id/estado (D-265; CC-042). Solo Administrador.
 * Un proyecto Cerrado queda solo para consulta; reabrirlo no altera su historial.
 */
export function changeProjectState(id: string, estado: Project["estado_proyecto"]): Promise<void> {
  return api.patch(`/api/sivu/projects/${id}/estado`, { estado_proyecto: estado }).then(() => undefined);
}

/** Demo (ver `CreateProjectInput`): la respuesta no se usa, se recarga la lista. */
export function createProject(input: CreateProjectInput): Promise<unknown> {
  return api.post<{ data: unknown }>("/api/projects", input).then((res) => res.data);
}
