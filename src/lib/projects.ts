import type { Project } from "../types/project";

/**
 * Etiquetas de `estado_proyecto` (CC-042: Activo / Cerrado). La API
 * devuelve el código; aquí solo se elige el texto visible.
 */
export const ESTADO_PROYECTO_LABEL: Record<Project["estado_proyecto"], string> = {
  activo: "Activo",
  cerrado: "Cerrado",
};
