import { api } from "./client";
import type { TreeInventory } from "../types/tree";

/**
 * Inventario espacial del proyecto (SIG-1, ADR-015). Los árboles llegan
 * siempre por el backend — el frontend nunca consulta Supabase para esto.
 */
export function listProjectTrees(projectId: string): Promise<TreeInventory> {
  return api.get<TreeInventory>(`/api/projects/${projectId}/trees`);
}
