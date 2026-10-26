import { api } from "./client";
import type { AltaArbolInput, ArbolAlta, Especie } from "../types/treeAlta";

/**
 * Alta municipal mínima y búsqueda de especies en la API de la Fase 6
 * (Fase 7, Inventario). Capa delgada sobre client.ts; los errores del
 * backend (403 rol, 404 proyecto sin sector, 422 árbol fuera del sector,
 * 400 datos inválidos) llegan tal cual como ApiError.
 */
export function crearArbolAlta(projectId: string, input: AltaArbolInput): Promise<ArbolAlta> {
  return api.post<{ data: ArbolAlta }>(`/api/sivu/projects/${projectId}/trees`, input).then((res) => res.data);
}

/** Hasta 20 especies del catálogo cuyo nombre científico contiene `nombre`. */
export function buscarEspecies(projectId: string, nombre: string): Promise<Especie[]> {
  const q = encodeURIComponent(nombre);
  return api.get<{ data: Especie[] }>(`/api/sivu/projects/${projectId}/species?nombre=${q}`).then((res) => res.data);
}
