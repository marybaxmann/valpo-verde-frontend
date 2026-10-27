import { api } from "./client";
import type { ResumenProyecto } from "../types/resumen";

/** B7 mínimo: resumen del proyecto para el Dashboard. */
export function obtenerResumen(projectId: string): Promise<ResumenProyecto> {
  return api.get<{ data: ResumenProyecto }>(`/api/sivu/projects/${projectId}/resumen`).then((res) => res.data);
}
