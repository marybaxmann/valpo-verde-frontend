import { api } from "./client";
import type { ListadoOt } from "../types/workOrder";

export interface ListarOtsParams {
  /** Códigos de estado_ot; sin valor, el backend entrega las abiertas. */
  estado?: readonly string[];
  tipo_ot?: "inspeccion" | "mantenimiento";
  limit?: number;
  offset?: number;
}

function query(params: ListarOtsParams & { project_id?: string }): string {
  const q = new URLSearchParams();
  if (params.estado?.length) q.set("estado", params.estado.join(","));
  if (params.tipo_ot) q.set("tipo_ot", params.tipo_ot);
  if (params.project_id) q.set("project_id", params.project_id);
  if (params.limit !== undefined) q.set("limit", String(params.limit));
  if (params.offset !== undefined) q.set("offset", String(params.offset));
  const qs = q.toString();
  return qs ? `?${qs}` : "";
}

/**
 * B3 — OT del proyecto (GET /api/sivu/projects/:id/work-orders, CC-065).
 * El backend decide qué OT ve cada rol y en qué orden las entrega.
 */
export function listarOtsProyecto(projectId: string, params: ListarOtsParams = {}): Promise<ListadoOt> {
  return api.get<ListadoOt>(`/api/sivu/projects/${projectId}/work-orders${query(params)}`);
}

/**
 * B4 — OT de las que el usuario es el responsable actual, de todos sus
 * proyectos (GET /api/sivu/work-orders/mine, CC-064 k, CC-065).
 */
export function listarMisOts(params: ListarOtsParams & { project_id?: string } = {}): Promise<ListadoOt> {
  return api.get<ListadoOt>(`/api/sivu/work-orders/mine${query(params)}`);
}

/**
 * Transición de estado de una OT de Inspección por su Inspector
 * responsable (PATCH /api/sivu/work-orders/:id/estado; CC-050, 018g):
 * Pendiente → Programada (con `fecha_accion_programada`) → En ejecución.
 * Las reglas las decide el backend; aquí solo se envía lo que eligió el usuario.
 */
export function transicionarOt(
  workOrderId: string,
  body: { estado: "programada"; fecha_accion_programada: string } | { estado: "en_ejecucion" }
): Promise<unknown> {
  return api.patch<{ data: unknown }>(`/api/sivu/work-orders/${workOrderId}/estado`, body).then((res) => res.data);
}

export interface MiembroAsignable {
  id: string;
  nombre: string;
  rol: string;
}

/** Miembros del proyecto que pueden ser responsables de una OT (B14). */
export function listarAsignables(projectId: string, rol: string): Promise<MiembroAsignable[]> {
  return api
    .get<{ data: MiembroAsignable[] }>(`/api/sivu/projects/${projectId}/assignable-members?rol=${encodeURIComponent(rol)}`)
    .then((res) => res.data);
}

/** Body de POST /api/sivu/projects/:id/work-orders (`crearOrdenTrabajoInspeccionSchema`). */
export interface CrearOtInspeccionInput {
  tree_id?: string;
  accion_solicitada: string;
  subtipo_accion?: string | null;
  motivo?: string | null;
  prioridad: string;
  observaciones?: string | null;
  responsable_accion_id: string;
}

/** Crea una OT de Inspección (#58; D-238, D-244). Solo Usuario municipal. */
export function crearOtInspeccion(projectId: string, body: CrearOtInspeccionInput): Promise<unknown> {
  return api.post<{ data: unknown }>(`/api/sivu/projects/${projectId}/work-orders`, body).then((res) => res.data);
}
