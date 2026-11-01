import { api } from "./client";
import type {
  CrearOtMantenimientoInput,
  EjecucionMantenimiento,
  OtEnRevision,
  RevisarEjecucionInput,
} from "../types/mantenimiento";

/**
 * Mantenimiento (#61; PR-020 v1.1; contrato §5 bis). Las reglas (subtipo
 * según la acción, revisión obligatoria en Tala y Retiro de tocón, una sola
 * ejecución pendiente, completar la OT) las aplica el backend; aquí solo se
 * envía lo que eligió el usuario.
 */

/** Crea una OT de Mantenimiento (solo Usuario municipal). */
export function crearOtMantenimiento(
  projectId: string,
  body: CrearOtMantenimientoInput
): Promise<{ id: string; codigo_ot: string | null }> {
  return api
    .post<{ data: { id: string; codigo_ot: string | null } }>(`/api/sivu/projects/${projectId}/work-orders/mantenimiento`, body)
    .then((res) => res.data);
}

/** Cambia el Inspector revisor (solo Usuario municipal; OT con revisión y no cerrada). */
export function cambiarRevisor(workOrderId: string, inspector_revisor_id: string): Promise<unknown> {
  return api
    .patch<{ data: unknown }>(`/api/sivu/work-orders/${workOrderId}/revisor`, { inspector_revisor_id })
    .then((res) => res.data);
}

/** Historial de ejecuciones de la OT, de la más antigua a la más reciente (incluye las rechazadas). */
export function listarEjecuciones(workOrderId: string): Promise<EjecucionMantenimiento[]> {
  return api
    .get<{ data: EjecucionMantenimiento[] }>(`/api/sivu/work-orders/${workOrderId}/ejecuciones`)
    .then((res) => res.data);
}

/**
 * Registra una ejecución con sus fotos (Encargado responsable, OT en
 * ejecución). `multipart/form-data`: los campos van como texto y las fotos
 * en el campo `fotos`, una entrada por archivo.
 */
export function registrarEjecucion(
  workOrderId: string,
  campos: Record<string, string>,
  fotos: Blob[]
): Promise<{ id: string; codigo_mantenimiento: string | null; estado_revision: string; estado_ot: string }> {
  const form = new FormData();
  for (const [k, v] of Object.entries(campos)) form.append(k, v);
  fotos.forEach((f, i) => form.append("fotos", f, f instanceof File ? f.name : `foto-${i + 1}.jpg`));
  return api
    .post<{ data: { id: string; codigo_mantenimiento: string | null; estado_revision: string; estado_ot: string } }>(
      `/api/sivu/work-orders/${workOrderId}/ejecuciones`,
      form
    )
    .then((res) => res.data);
}

/** Aprueba o rechaza una ejecución (solo el Inspector revisor asignado). */
export function revisarEjecucion(workOrderId: string, recordId: string, body: RevisarEjecucionInput): Promise<unknown> {
  return api
    .patch<{ data: unknown }>(`/api/sivu/work-orders/${workOrderId}/ejecuciones/${recordId}/revision`, body)
    .then((res) => res.data);
}

/** «Revisiones de mantenimiento»: las OT donde el Inspector es el revisor (CC-064 b). */
export function listarRevisiones(params: { project_id?: string; solo_pendientes?: boolean } = {}): Promise<OtEnRevision[]> {
  const q = new URLSearchParams();
  if (params.project_id) q.set("project_id", params.project_id);
  if (params.solo_pendientes !== undefined) q.set("solo_pendientes", String(params.solo_pendientes));
  const qs = q.toString();
  return api.get<{ data: OtEnRevision[] }>(`/api/sivu/work-orders/revisiones${qs ? `?${qs}` : ""}`).then((res) => res.data);
}
