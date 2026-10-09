import { api } from "./client";

/**
 * Infraestructura (datos crudos), órdenes de trabajo e incidencias —
 * corte demo. Catálogos servidos por el backend (LISTAS CC-004 y
 * DICCIONARIO_CAMPOS): el frontend guarda el `codigo` y muestra la `etiqueta`.
 */

export interface CatalogItem {
  codigo: string;
  etiqueta: string;
}

export interface MaintenanceAction extends CatalogItem {
  subtipos: CatalogItem[];
  requiere_observacion?: boolean;
}

export interface ModuleCatalogs {
  maintenance_actions: MaintenanceAction[];
  maintenance_states: CatalogItem[];
  incident_states: CatalogItem[];
  infrastructure: Record<string, string[]>;
}

export type InfraVariables = Record<string, string | null>;

export interface InfrastructureAssessmentDTO {
  id: string;
  tree_id: string;
  fecha_evaluacion: string;
  variables: InfraVariables;
  observaciones: string | null;
  inspector_nombre: string | null;
  created_at: string;
}

export interface MaintenanceOrder {
  id: string;
  codigo_ot: string | null;
  tree_id: string;
  tipo_intervencion: string;
  subtipo_accion: string | null;
  fecha_programada: string | null;
  responsable: string | null;
  estado: string;
  observacion: string | null;
  created_at: string;
  fecha_actualizacion: string | null;
}

export interface Incident {
  id: string;
  codigo_incidencia: string | null;
  tree_id: string | null;
  project_id: string;
  tipo: string;
  descripcion: string | null;
  estado: string;
  origen_reporte: string | null;
  observacion: string | null;
  fecha_actualizacion: string | null;
  created_at: string;
}

let catalogsPromise: Promise<ModuleCatalogs> | null = null;
export function getModuleCatalogs(): Promise<ModuleCatalogs> {
  if (!catalogsPromise) {
    catalogsPromise = api
      .get<{ data: ModuleCatalogs }>("/api/catalogs/modules")
      .then((r) => r.data)
      .catch((err) => {
        catalogsPromise = null;
        throw err;
      });
  }
  return catalogsPromise;
}

export const createInfrastructureAssessment = (
  treeId: string,
  payload: { fecha_evaluacion: string; variables: InfraVariables; observaciones?: string | null }
) => api.post<{ data: InfrastructureAssessmentDTO }>(`/api/trees/${treeId}/infrastructure-assessments`, payload);

export const listTreeInfrastructureAssessments = (treeId: string) =>
  api.get<{ data: InfrastructureAssessmentDTO[] }>(`/api/trees/${treeId}/infrastructure-assessments`);

export const listProjectInfrastructureAssessments = (projectId: string) =>
  api.get<{ data: InfrastructureAssessmentDTO[] }>(`/api/projects/${projectId}/infrastructure-assessments`);

export const createMaintenanceOrder = (
  projectId: string,
  payload: {
    tree_id: string;
    accion_solicitada: string;
    subtipo_accion: string | null;
    fecha_programada: string | null;
    responsable: string | null;
    observacion: string | null;
  }
) => api.post<{ data: MaintenanceOrder }>(`/api/projects/${projectId}/maintenance`, payload);

export const listProjectMaintenance = (projectId: string) =>
  api.get<{ data: MaintenanceOrder[] }>(`/api/projects/${projectId}/maintenance`);

export const createIncident = (
  projectId: string,
  payload: { tree_id: string | null; tipo: string; descripcion: string; origen_reporte: string | null }
) => api.post<{ data: Incident }>(`/api/projects/${projectId}/incidents`, payload);

export const listProjectIncidents = (projectId: string) =>
  api.get<{ data: Incident[] }>(`/api/projects/${projectId}/incidents`);

/** Etiqueta de un código de acción/subtipo según el catálogo del backend. */
export function actionLabel(catalogs: ModuleCatalogs | null, accion: string, subtipo?: string | null): string {
  const a = catalogs?.maintenance_actions.find((x) => x.codigo === accion);
  const s = a?.subtipos.find((x) => x.codigo === subtipo);
  return [a?.etiqueta ?? accion, s?.etiqueta ?? subtipo].filter(Boolean).join(" · ");
}

export const updateMaintenanceState = (projectId: string, orderId: string, estado: string) =>
  api.patch<{ data: MaintenanceOrder }>(`/api/projects/${projectId}/maintenance/${orderId}/estado`, { estado });

export const updateIncidentState = (projectId: string, incidentId: string, estado: string, observacion: string | null) =>
  api.patch<{ data: Incident }>(`/api/projects/${projectId}/incidents/${incidentId}/estado`, { estado, observacion });

/**
 * Etiqueta de un estado según el catálogo del backend; si el código no
 * está en el catálogo (p. ej. 'pendiente' histórico de incidencias) se
 * muestra legible tal cual, sin reinterpretarlo.
 */
export function estadoLabel(estado: string, states?: CatalogItem[]): string {
  const found = states?.find((s) => s.codigo === estado);
  if (found) return found.etiqueta;
  return estado ? estado.charAt(0).toUpperCase() + estado.slice(1).replace(/_/g, " ") : "—";
}

/** Estados finales por su propio nombre en la fuente (Completada/Cancelada, Resuelta/Descartada). */
export const MAINTENANCE_FINAL = ["completada", "cancelada"];
export const INCIDENT_FINAL = ["resuelta", "descartada"];
