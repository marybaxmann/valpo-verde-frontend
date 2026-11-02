import { api } from "./client";
import type { FichaArbol } from "../types/fichaArbol";

/** B2: ficha completa del árbol, con su historial de versiones vigentes, OT e incidencias. */
export function obtenerFichaArbol(projectId: string, treeId: string): Promise<FichaArbol> {
  return api.get<{ data: FichaArbol }>(`/api/sivu/projects/${projectId}/trees/${treeId}`).then((res) => res.data);
}
