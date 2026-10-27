import { api } from "./client";
import type { Diagnostico } from "../types/diagnostico";

/** Un diagnóstico por árbol con inspección finalizada (B18 mínimo). */
export function listarDiagnosticos(projectId: string): Promise<Diagnostico[]> {
  return api.get<{ data: Diagnostico[] }>(`/api/sivu/projects/${projectId}/diagnosticos`).then((res) => res.data);
}
