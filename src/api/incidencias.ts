import { api } from "./client";
import type { IncidenciaDetalle, ListadoIncidencias, RevisionIncidenciaInput } from "../types/incidencia";

/** B9: incidencias del proyecto. Los filtros los aplica el backend. */
export function listarIncidencias(
  projectId: string,
  params: { estado?: string[]; origen?: string; tipo?: string; limit?: number; offset?: number } = {}
): Promise<ListadoIncidencias> {
  const q = new URLSearchParams();
  if (params.estado?.length) q.set("estado", params.estado.join(","));
  if (params.origen) q.set("origen", params.origen);
  if (params.tipo) q.set("tipo", params.tipo);
  q.set("limit", String(params.limit ?? 200));
  q.set("offset", String(params.offset ?? 0));
  return api.get<ListadoIncidencias>(`/api/sivu/projects/${projectId}/incidencias?${q.toString()}`);
}

/** Detalle con fotos (enlaces firmados de 10 minutos). */
export function obtenerIncidencia(projectId: string, incidentId: string): Promise<IncidenciaDetalle> {
  return api
    .get<{ data: IncidenciaDetalle }>(`/api/sivu/projects/${projectId}/incidencias/${incidentId}`)
    .then((res) => res.data);
}

/** Revisión del Usuario municipal (D-185 a D-189). «Descartada» borra las fotos del reporte. */
export function revisarIncidencia(projectId: string, incidentId: string, body: RevisionIncidenciaInput): Promise<unknown> {
  return api
    .patch<{ data: unknown }>(`/api/sivu/projects/${projectId}/incidencias/${incidentId}/revision`, body)
    .then((res) => res.data);
}
