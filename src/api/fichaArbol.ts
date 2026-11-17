import { api } from "./client";
import type { FichaArbol } from "../types/fichaArbol";

/** B2: ficha completa del árbol, con su historial de versiones vigentes, OT e incidencias. */
export function obtenerFichaArbol(projectId: string, treeId: string): Promise<FichaArbol> {
  return api.get<{ data: FichaArbol }>(`/api/sivu/projects/${projectId}/trees/${treeId}`).then((res) => res.data);
}

/** Origen de una foto del árbol (037). */
export type OrigenFoto = "registro" | "inspeccion" | "mantenimiento" | "incidencia";

export interface FotoArbol {
  id: string;
  vista: string | null;
  /** Enlace firmado de corta duración. */
  url: string;
  created_at: string;
  uploaded_by: string | null;
  origen: OrigenFoto;
  inspection_id: string | null;
  sha256: string | null;
}

/** 037: todas las fotos del ejemplar (registro, inspecciones, mantención, incidencias), con enlaces firmados. */
export function listarFotosArbol(projectId: string, treeId: string): Promise<FotoArbol[]> {
  return api.get<{ data: FotoArbol[] }>(`/api/sivu/projects/${projectId}/trees/${treeId}/photos`).then((res) => res.data);
}
