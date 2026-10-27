import { api } from "./client";
import type { ListadoOt } from "../types/workOrder";

export interface ListarOtsParams {
  /** Códigos de estado_ot; sin valor, el backend entrega las abiertas. */
  estado?: readonly string[];
  tipo_ot?: "inspeccion" | "mantenimiento";
  limit?: number;
  offset?: number;
}

/**
 * B3 — OT del proyecto (GET /api/sivu/projects/:id/work-orders, CC-065).
 * El backend decide qué OT ve cada rol y en qué orden las entrega.
 */
export function listarOtsProyecto(projectId: string, params: ListarOtsParams = {}): Promise<ListadoOt> {
  const q = new URLSearchParams();
  if (params.estado?.length) q.set("estado", params.estado.join(","));
  if (params.tipo_ot) q.set("tipo_ot", params.tipo_ot);
  if (params.limit !== undefined) q.set("limit", String(params.limit));
  if (params.offset !== undefined) q.set("offset", String(params.offset));
  const qs = q.toString();
  return api.get<ListadoOt>(`/api/sivu/projects/${projectId}/work-orders${qs ? `?${qs}` : ""}`);
}
