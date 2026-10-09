import { api } from "./client";
import { supabase } from "../lib/supabase";
import type {
  CreateTreePayload,
  SpeciesItem,
  TreeDetailDTO,
  TreeInventory,
  TreeMeasurementRow,
  UpdateTreePayload,
} from "../types/tree";

/**
 * Inventario espacial del proyecto (SIG-1, ADR-015). Los árboles llegan
 * siempre por el backend — el frontend nunca consulta Supabase para esto.
 */
export function listProjectTrees(projectId: string): Promise<TreeInventory> {
  return api.get<TreeInventory>(`/api/projects/${projectId}/trees`);
}

/**
 * Alta atómica de árbol y medición dendrométrica inicial (INV-1B / INV-1C).
 * POST /api/projects/:projectId/trees
 */
export function createProjectTree(
  projectId: string,
  payload: CreateTreePayload
): Promise<{ data: TreeDetailDTO }> {
  return api.post<{ data: TreeDetailDTO }>(`/api/projects/${projectId}/trees`, payload);
}

/**
 * Ficha completa de un árbol con su medición actual resuelta (INV-1B).
 * GET /api/trees/:treeId
 */
export function getTreeDetail(treeId: string): Promise<{ data: TreeDetailDTO }> {
  return api.get<{ data: TreeDetailDTO }>(`/api/trees/${treeId}`);
}

/**
 * Edita identidad del árbol (especie, dirección, comuna, lugar de
 * referencia). Nunca medición dendrométrica ni ciclo de vida — eso no
 * es "editar inventario", es un concepto distinto (modelo-arbol-medicion.md).
 * PATCH /api/trees/:treeId
 */
export function updateTree(
  treeId: string,
  payload: UpdateTreePayload
): Promise<{ data: TreeDetailDTO }> {
  return api.patch<{ data: TreeDetailDTO }>(`/api/trees/${treeId}`, payload);
}

/**
 * Historial de mediciones cronológicas de un árbol (INV-1B).
 * GET /api/trees/:treeId/measurements
 */
export function getTreeMeasurements(
  treeId: string,
  includeAnuladas = false
): Promise<{ data: TreeMeasurementRow[]; meta: { total: number } }> {
  const query = includeAnuladas ? "?include_anuladas=true" : "";
  return api.get<{ data: TreeMeasurementRow[]; meta: { total: number } }>(
    `/api/trees/${treeId}/measurements${query}`
  );
}

/**
 * Catálogo de especies disponibles en la plataforma.
 * Consulta la tabla global de species en Supabase (anon key) porque el
 * backend todavía no expone un endpoint de catálogo (ver HANDOFF).
 * No hay respaldo ficticio: si la consulta falla, se propaga el error y
 * la UI debe mostrar el estado real (vacío/error), nunca una especie fija.
 */
export async function listSpeciesCatalog(): Promise<SpeciesItem[]> {
  const { data, error } = await supabase
    .from("species")
    .select("id, nombre_cientifico, nombre_comun")
    .order("nombre_cientifico");

  if (error) {
    throw new Error("No se pudo cargar el catálogo de especies.");
  }
  return (data as SpeciesItem[]) ?? [];
}
