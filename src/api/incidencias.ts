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

/** Resultado del borrado (CC-079): lo que se borró junto con la incidencia. */
export interface BorradoIncidencia {
  codigo_incidencia: string;
  ots_borradas: { codigo_ot: string; tipo_ot: string; estado_ot: string }[];
  fotos_borradas: number;
}

/**
 * Borra la incidencia con sus fotos, los datos del reportante y sus OT
 * (CC-079). Solo el Usuario municipal; queda un registro con el motivo.
 * El backend rechaza (409) si alguna OT ya tiene trabajo registrado.
 */
export function borrarIncidencia(projectId: string, incidentId: string, motivo: string): Promise<BorradoIncidencia> {
  return api
    .delete<{ data: BorradoIncidencia }>(`/api/sivu/projects/${projectId}/incidencias/${incidentId}`, { motivo })
    .then((res) => res.data);
}
