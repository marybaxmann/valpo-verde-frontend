import { api } from "./client";
import type { Diagnostico } from "../types/diagnostico";

/** Un diagnóstico por árbol con inspección finalizada (B18 mínimo). */
export function listarDiagnosticos(projectId: string, treeId?: string): Promise<Diagnostico[]> {
  const q = treeId ? `?tree_id=${encodeURIComponent(treeId)}` : "";
  return api.get<{ data: Diagnostico[] }>(`/api/sivu/projects/${projectId}/diagnosticos${q}`).then((res) => res.data);
}
