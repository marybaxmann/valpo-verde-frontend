import { api } from "./client";
import type { CompletarEspecieInput, EspecieCatalogo, EspecieRenombrada } from "../types/species";

/**
 * Catálogo de especies (CC-053). Buscar: cualquier rol con acceso al
 * proyecto. Completar y corregir: solo el Inspector (lo decide el backend).
 */

/** Hasta 20 especies cuyo nombre científico contiene `nombre`. */
export function buscarEspeciesCatalogo(projectId: string, nombre: string): Promise<EspecieCatalogo[]> {
  const q = encodeURIComponent(nombre);
  return api
    .get<{ data: EspecieCatalogo[] }>(`/api/sivu/projects/${projectId}/species?nombre=${q}`)
    .then((res) => res.data);
}

export function completarEspecie(
  projectId: string,
  speciesId: string,
  input: CompletarEspecieInput
): Promise<EspecieCatalogo> {
  return api
    .patch<{ data: EspecieCatalogo }>(`/api/sivu/projects/${projectId}/species/${speciesId}`, input)
    .then((res) => res.data);
}

/** Corrige el nombre científico. Cambia el nombre en los árboles de todos los proyectos. */
export function renombrarEspecie(projectId: string, speciesId: string, especieCientifica: string): Promise<EspecieRenombrada> {
  return api
    .patch<{ data: EspecieRenombrada }>(`/api/sivu/projects/${projectId}/species/${speciesId}/nombre`, {
      especie_cientifica: especieCientifica,
    })
    .then((res) => res.data);
}
